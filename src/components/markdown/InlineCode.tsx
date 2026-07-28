import React, { useState } from 'react';
import { notificationService } from '../../notifications/notificationService';
import { PROSE_CLASSNAMES } from './proseClassNames';
import { reactNodeToText } from './reactNodeToText';

/**
 * Portfolio UX Sprint: every inline code span (` `help` `, ` `npm run about` `,
 * etc.) across every markdown surface — not just README's Quick Start badge —
 * copies its text on click, VS-Code-docs style: subtle hover background,
 * pointer cursor, brief "Copied" affordance plus a toast. A systemic upgrade
 * to the shared inline-code styling (PROSE_CLASSNAMES.inlineCode) rather than
 * a one-off special case hiding inside README, so it stays true to "one
 * markdown design system" from the prior typography sprint.
 */
export function InlineCode({ children }: { children?: React.ReactNode }) {
  const [justCopied, setJustCopied] = useState(false);

  const handleClick = () => {
    const text = reactNodeToText(children);
    if (!text) return;
    void navigator.clipboard.writeText(text).then(() => {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1200);
      notificationService.info({
        title: 'Copied to clipboard',
        message: text,
        source: 'Editor',
        duration: 2000,
      });
    });
  };

  return (
    <code
      className={`${PROSE_CLASSNAMES.inlineCode} cursor-pointer transition-colors hover:bg-[#3a3d3e]`}
      onClick={handleClick}
      title="Click to copy"
    >
      {justCopied ? 'Copied!' : children}
    </code>
  );
}
