import React from 'react';

/** Flattens a react-markdown-rendered subtree back to its plain text — used
 * anywhere the visible React children need to become a real string (copy to
 * clipboard, feeding Shiki a code sample). Shared by CodeBlock.tsx and
 * InlineCode.tsx rather than duplicated in each. */
export function reactNodeToText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return reactNodeToText(node.props.children);
  return '';
}
