import type { DocumentationModel, DocumentationSectionModel } from './types';
import { parseFrontmatter } from './frontmatter';
import { createSlugger } from './slug';

const H1_PATTERN = /^#\s+(.+?)\s*$/;
const H2_PATTERN = /^##\s+(.+?)\s*$/;
const FENCE_PATTERN = /^```/;

/**
 * Raw project-doc markdown in, a typed DocumentationModel out — the same
 * "pure function, structured model out" philosophy as parseManifest()
 * (src/manifest/parser.ts). Splits on H1 (title) and H2 (section)
 * boundaries only; everything else (H3+, paragraphs, lists, tables, code)
 * stays as raw markdown inside a section's bodyMarkdown, rendered later by
 * DocumentationSection's own react-markdown pass.
 *
 * Heading detection tracks fenced-code-block state so a line that merely
 * *looks* like a heading (e.g. a `## ` code comment inside a fenced
 * example) is never mistaken for a real section boundary.
 */
export function parseDocumentationDocument(raw: string): DocumentationModel {
  const { frontmatter, body } = parseFrontmatter(raw);
  const lines = body.split('\n');
  const slugify = createSlugger();

  let title = '';
  let titleLineIndex = -1;
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const h1 = H1_PATTERN.exec(line);
    if (h1) {
      title = h1[1];
      titleLineIndex = i;
      break;
    }
  }

  const sections: DocumentationSectionModel[] = [];
  let intro: string | undefined;
  let currentHeading: string | null = null;
  let currentId = '';
  let currentBodyLines: string[] = [];
  let introLines: string[] = [];
  inFence = false;

  const flushCurrent = () => {
    if (currentHeading !== null) {
      sections.push({
        id: currentId,
        heading: currentHeading,
        bodyMarkdown: currentBodyLines.join('\n').trim(),
      });
    }
  };

  for (let i = titleLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      (currentHeading === null ? introLines : currentBodyLines).push(line);
      continue;
    }

    if (!inFence) {
      const h2 = H2_PATTERN.exec(line);
      if (h2) {
        flushCurrent();
        currentHeading = h2[1];
        currentId = slugify(currentHeading);
        currentBodyLines = [];
        continue;
      }
    }

    (currentHeading === null ? introLines : currentBodyLines).push(line);
  }
  flushCurrent();

  const introText = introLines.join('\n').trim();
  if (introText.length > 0) intro = introText;

  return { title, frontmatter, intro, sections };
}
