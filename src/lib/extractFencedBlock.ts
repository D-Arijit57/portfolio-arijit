/**
 * Pulls the text of a fenced code block with a specific language tag out of
 * raw markdown content — e.g. a ```github-contribution-calendar block
 * embedded in a generated file (server/providers/github/githubMarkdownGenerator.ts).
 * Used to read structured data straight out of already-hydrated VFS file
 * content, no separate fetch or endpoint.
 */
export function extractFencedBlock(content: string, language: string): string | null {
  const escaped = language.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('```' + escaped + '\\n([\\s\\S]*?)\\n```');
  const match = content.match(pattern);
  return match ? match[1] : null;
}
