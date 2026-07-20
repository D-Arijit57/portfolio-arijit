import type {
  RawGitHubCommitSearchResponse,
  RawGitHubCommitSearchResult,
  RawGitHubContributionCalendar,
  RawGitHubEvent,
  RawGitHubPinnedRepo,
  RawGitHubRepo,
  RawGitHubUser,
} from './githubTypes';

const RECENT_COMMITS_LIMIT = 10;

const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Thrown for every failure mode this client can produce — network, timeout,
 * non-2xx, rate limiting. GitHubProvider (the orchestrator) is what decides
 * how each case affects sync status (VFS_DESIGN.md §11.5); this client only
 * classifies and reports.
 */
export class GitHubApiClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfterSeconds?: number,
    readonly kind: 'rate-limited' | 'not-found' | 'http-error' | 'timeout' | 'network' = 'http-error',
  ) {
    super(message);
    this.name = 'GitHubApiClientError';
  }
}

/**
 * API Client stage (VFS_DESIGN.md §11.2): network I/O against the GitHub API
 * only — auth, timeout, rate-limit-header parsing. Returns raw response data
 * or throws GitHubApiClientError. Knows nothing about VirtualFile, markdown,
 * or this provider's internal domain types.
 */
export class GitHubApiClient {
  constructor(
    private readonly username: string,
    private readonly token?: string,
  ) {}

  async getUser(): Promise<RawGitHubUser> {
    return this.request<RawGitHubUser>(`${GITHUB_API_BASE_URL}/users/${this.username}`);
  }

  async listRepos(): Promise<RawGitHubRepo[]> {
    return this.request<RawGitHubRepo[]>(
      `${GITHUB_API_BASE_URL}/users/${this.username}/repos?per_page=100&sort=updated`,
    );
  }

  async listPublicEvents(): Promise<RawGitHubEvent[]> {
    return this.request<RawGitHubEvent[]>(
      `${GITHUB_API_BASE_URL}/users/${this.username}/events/public?per_page=100`,
    );
  }

  /**
   * Real commit history (sha, message, repo) across every repo the author
   * has committed to — the public Events API's PushEvent payload carries no
   * commit-level detail (see RawGitHubEvent's comment), so this is a
   * separate endpoint: the REST Search API's global commit search
   * (`GET /search/commits`, GA, not preview — confirmed against GitHub's own
   * docs before implementing). `is:public` is explicit, not incidental: a
   * token with broader access must never let a private repo's commit
   * message leak onto a public portfolio page. Token-gated like pinned
   * repos/contribution calendar — the Search API's unauthenticated cap
   * (10 requests/min) is tight enough that an unauthenticated call here
   * isn't worth the risk of contending with other providers' refresh
   * cycles; authenticated search gets 30/min, comfortable for a refresh
   * that runs at most every few minutes.
   */
  async searchRecentCommits(): Promise<RawGitHubCommitSearchResult[] | undefined> {
    if (!this.token) {
      return undefined;
    }
    const query = encodeURIComponent(`author:${this.username} is:public`);
    const body = await this.request<RawGitHubCommitSearchResponse>(
      `${GITHUB_API_BASE_URL}/search/commits?q=${query}&sort=author-date&order=desc&per_page=${RECENT_COMMITS_LIMIT}`,
    );
    return body.items;
  }

  /**
   * Pinned repos are GraphQL-only on GitHub's API — unauthenticated GraphQL
   * requests are rejected outright, so this returns undefined (not an error)
   * when no token is configured. GitHubProvider treats that as a best-effort
   * miss, not a sync failure (VFS_DESIGN.md §11.5 partial-failure handling).
   */
  async listPinnedRepos(): Promise<RawGitHubPinnedRepo[] | undefined> {
    if (!this.token) {
      return undefined;
    }
    const query = `
      query($login: String!) {
        user(login: $login) {
          pinnedItems(first: 6, types: [REPOSITORY]) {
            nodes {
              ... on Repository {
                name
                description
                url
                stargazerCount
                primaryLanguage { name }
              }
            }
          }
        }
      }
    `;
    const body = await this.request<{
      data?: { user?: { pinnedItems?: { nodes?: RawGitHubPinnedRepo[] } } };
      errors?: unknown[];
    }>(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      body: JSON.stringify({ query, variables: { login: this.username } }),
    });
    return body.data?.user?.pinnedItems?.nodes ?? [];
  }

  /**
   * The real contribution calendar (weeks/days/counts) is GraphQL-only, same
   * constraint as pinned repos — unauthenticated requests are rejected, so
   * this returns undefined (not an error) with no token configured.
   * GitHubProvider treats that as a best-effort miss (VFS_DESIGN.md §11.5),
   * exactly like pinned repos already do.
   */
  async getContributionCalendar(): Promise<RawGitHubContributionCalendar | undefined> {
    if (!this.token) {
      return undefined;
    }
    const query = `
      query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
      }
    `;
    const body = await this.request<{
      data?: { user?: { contributionsCollection?: { contributionCalendar?: RawGitHubContributionCalendar } } };
      errors?: unknown[];
    }>(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      body: JSON.stringify({ query, variables: { login: this.username } }),
    });
    return body.data?.user?.contributionsCollection?.contributionCalendar;
  }

  private async request<T>(url: string, init: { method?: string; body?: string } = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: init.method ?? 'GET',
        body: init.body,
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'vs-code-portfolio-backend',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
      });

      if (response.status === 404) {
        throw new GitHubApiClientError(`GitHub user "${this.username}" not found`, 404, undefined, 'not-found');
      }

      if (response.status === 403 || response.status === 429) {
        const retryAfterHeader = response.headers.get('retry-after');
        const remaining = response.headers.get('x-ratelimit-remaining');
        if (response.status === 429 || remaining === '0') {
          throw new GitHubApiClientError(
            'GitHub API rate limit exceeded',
            response.status,
            retryAfterHeader ? Number(retryAfterHeader) : undefined,
            'rate-limited',
          );
        }
      }

      if (!response.ok) {
        throw new GitHubApiClientError(
          `GitHub API request failed with status ${response.status}`,
          response.status,
          undefined,
          'http-error',
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof GitHubApiClientError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GitHubApiClientError(`GitHub API request timed out: ${url}`, undefined, undefined, 'timeout');
      }
      throw new GitHubApiClientError(
        `GitHub API request failed: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        undefined,
        'network',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
