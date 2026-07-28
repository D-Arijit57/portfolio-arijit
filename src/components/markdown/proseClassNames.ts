/**
 * Markdown Documentation System sprint: the one set of Tailwind classNames
 * every markdown surface renders its typography with — restrained heading
 * sizes (hierarchy comes from spacing, not big font jumps, per the sprint's
 * reference screenshot), muted body/heading colors (never pure white), and
 * a warm tan accent lifted directly from that reference — applied to both
 * inline code AND bold/strong text (the reference's own "American Chase"-
 * style emphasis), since plain markdown content with no inline code (e.g.
 * profile.md's `**Frontend:**`-style labels) needs somewhere for that accent
 * to actually show up.
 * MarkdownFileView (profile.md, README.md, RESUME.md, any generic .md) and
 * the Project Documentation Viewer (cortexa.md, any /projects/<Name>/*.md)
 * both read from this one module, so a future markdown page can't introduce
 * a third variant.
 */
export const PROSE_CLASSNAMES = {
  h1: 'mb-6 mt-0 border-b border-[#30363d] pb-4 text-[28px] font-semibold leading-tight text-[#e6e6e6]',
  h2: 'mb-4 mt-12 text-[20px] font-semibold leading-snug text-[#e6e6e6]',
  h3: 'mb-3 mt-9 text-[17px] font-semibold leading-snug text-[#e6e6e6]',
  h4: 'mb-2 mt-7 text-[15px] font-semibold text-[#e6e6e6]',
  h5: 'mb-2 mt-6 text-[14px] font-semibold text-[#e6e6e6]',
  h6: 'mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wide text-[#9d9d9d]',
  p: 'mb-5 text-[15px] leading-[1.8] text-[#b0b0b0]',
  ul: 'mb-5 ml-6 list-disc space-y-2 text-[15px] leading-[1.8] text-[#b0b0b0] marker:text-[#6a6a6a]',
  ol: 'mb-5 ml-6 list-decimal space-y-2 text-[15px] leading-[1.8] text-[#b0b0b0] marker:text-[#6a6a6a]',
  li: 'pl-1.5',
  blockquote:
    'my-6 border-l-[3px] border-[#30363d] py-1 pl-5 italic leading-[1.8] text-[#8b949e] [&>p]:mb-2 [&>p:last-child]:mb-0',
  hr: 'my-10 border-0 border-t border-[#30363d]',
  a: 'text-[#007acc] hover:underline',
  strong: 'font-semibold text-[#d19a66]',
  em: 'italic',
  img: 'my-6 max-w-full rounded-md border border-[#30363d]',
  tableWrapper: 'my-6 overflow-x-auto rounded-md border border-[#30363d]',
  table: 'w-full border-collapse text-[14px]',
  thead: 'bg-[#21262d]',
  tbody: '[&>tr:nth-child(even)]:bg-white/[0.02]',
  tr: 'border-b border-[#30363d] last:border-0',
  th: 'px-4 py-2.5 text-left font-semibold text-[#e6e6e6]',
  td: 'px-4 py-2.5 align-top text-[#b0b0b0]',
  inlineCode: 'rounded border border-[#30363d] bg-[#2a2d2e] px-1.5 py-0.5 font-mono text-[13px] text-[#d19a66]',
} as const;

export type ProseTag = keyof typeof PROSE_CLASSNAMES;
