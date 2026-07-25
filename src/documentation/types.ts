/**
 * Domain model for the Project Documentation Viewer — the same "structured
 * model is the source of truth, the renderer only reads it" philosophy as
 * the Architecture Platform and Manifest Viewer, applied to project
 * documentation markdown. Frontmatter is an open string/string[] record
 * (never a closed interface) so a doc can introduce a new key (e.g.
 * `status`) with zero parser changes, mirroring ManifestModel's open
 * category keys.
 */

export type DocumentationFrontmatter = Record<string, string | string[]>;

export interface DocumentationSectionModel {
  /** Slugified, collision-safe — doubles as the DOM anchor id. */
  id: string;
  /** Raw H2 heading text. */
  heading: string;
  /** Raw markdown between this H2 (exclusive) and the next H2/EOF. */
  bodyMarkdown: string;
}

export interface DocumentationModel {
  /** H1 text, '' if the document has none. */
  title: string;
  frontmatter: DocumentationFrontmatter;
  /** Raw markdown between the H1 and the first H2, if any. */
  intro?: string;
  sections: DocumentationSectionModel[];
}
