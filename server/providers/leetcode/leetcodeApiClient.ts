import type {
  RawLeetCodeCalendar,
  RawLeetCodeContestHistoryEntry,
  RawLeetCodeContestRanking,
  RawLeetCodeMatchedUser,
  RawLeetCodeRecentSubmission,
} from './leetcodeTypes';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';
const REQUEST_TIMEOUT_MS = 8000;
const RECENT_SUBMISSIONS_LIMIT = 20;

/**
 * Thrown for every failure mode this client can produce — network, timeout,
 * non-2xx, rate limiting, unknown username. LeetCodeProvider (the
 * orchestrator) decides how each case affects sync status
 * (ARCHITECTURE.md "LeetCode Provider" §9); this client only classifies and
 * reports.
 */
export class LeetCodeApiClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly kind: 'rate-limited' | 'not-found' | 'http-error' | 'timeout' | 'network' = 'http-error',
  ) {
    super(message);
    this.name = 'LeetCodeApiClientError';
  }
}

/**
 * API Client stage (VFS_DESIGN.md §11.2): network I/O against LeetCode's
 * public GraphQL endpoint only. Returns raw response data or throws
 * LeetCodeApiClientError. Knows nothing about VirtualFile, markdown, or this
 * provider's internal domain types.
 *
 * Unlike GitHubApiClient, there is no official REST API and no documented
 * rate-limit headers to read (flagged in ARCHITECTURE.md "LeetCode Provider"
 * §3/§9) — this client applies a fixed, conservative request pattern rather
 * than header-driven backoff. Public profile data requires no auth token.
 */
export class LeetCodeApiClient {
  constructor(private readonly username: string) {}

  async getProfile(): Promise<RawLeetCodeMatchedUser> {
    const data = await this.request<{ matchedUser: RawLeetCodeMatchedUser | null }>(
      `query userProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            realName
            userAvatar
            ranking
            countryName
            company
            school
            aboutMe
          }
          submitStatsGlobal {
            acSubmissionNum { difficulty count submissions }
            totalSubmissionNum { difficulty count submissions }
          }
        }
      }`,
      { username: this.username },
    );

    if (!data.matchedUser) {
      throw new LeetCodeApiClientError(`LeetCode user "${this.username}" not found`, undefined, 'not-found');
    }
    return data.matchedUser;
  }

  async getRecentSubmissions(): Promise<RawLeetCodeRecentSubmission[]> {
    const data = await this.request<{ recentAcSubmissionList: RawLeetCodeRecentSubmission[] | null }>(
      `query recentSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          title
          titleSlug
          timestamp
          statusDisplay
          lang
        }
      }`,
      { username: this.username, limit: RECENT_SUBMISSIONS_LIMIT },
    );
    return data.recentAcSubmissionList ?? [];
  }

  async getContestInfo(): Promise<{
    ranking: RawLeetCodeContestRanking | null;
    history: RawLeetCodeContestHistoryEntry[];
  }> {
    const data = await this.request<{
      userContestRanking: RawLeetCodeContestRanking | null;
      userContestRankingHistory: RawLeetCodeContestHistoryEntry[] | null;
    }>(
      `query contestInfo($username: String!) {
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
          globalRanking
          totalParticipants
          topPercentage
        }
        userContestRankingHistory(username: $username) {
          attended
          rating
          ranking
          contest { title startTime }
        }
      }`,
      { username: this.username },
    );
    return {
      ranking: data.userContestRanking,
      history: data.userContestRankingHistory ?? [],
    };
  }

  async getCalendar(): Promise<RawLeetCodeCalendar | undefined> {
    const data = await this.request<{
      matchedUser: { userCalendar: RawLeetCodeCalendar | null } | null;
    }>(
      `query userCalendar($username: String!) {
        matchedUser(username: $username) {
          userCalendar {
            streak
            totalActiveDays
            submissionCalendar
          }
        }
      }`,
      { username: this.username },
    );
    return data.matchedUser?.userCalendar ?? undefined;
  }

  private async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          // LeetCode's edge rejects some requests without an Origin/Referer
          // resembling a browser request to leetcode.com itself.
          Referer: 'https://leetcode.com',
          'User-Agent': 'vs-code-portfolio-backend',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (response.status === 429) {
        throw new LeetCodeApiClientError('LeetCode API rate limit exceeded', response.status, 'rate-limited');
      }

      if (!response.ok) {
        throw new LeetCodeApiClientError(
          `LeetCode API request failed with status ${response.status}`,
          response.status,
          'http-error',
        );
      }

      const body = (await response.json()) as { data?: T; errors?: Array<{ message?: string }> };

      if (!body.data) {
        throw new LeetCodeApiClientError(
          body.errors?.[0]?.message ?? 'LeetCode API returned no data',
          response.status,
          'http-error',
        );
      }

      return body.data;
    } catch (err) {
      if (err instanceof LeetCodeApiClientError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new LeetCodeApiClientError('LeetCode API request timed out', undefined, 'timeout');
      }
      throw new LeetCodeApiClientError(
        `LeetCode API request failed: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        'network',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
