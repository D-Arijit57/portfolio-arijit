import React from 'react';
import type { CalloutInfo } from '../../documentation/callout';
import { resolveCalloutStyle } from '../../documentation/calloutStyles';

function isWhitespaceString(value: React.ReactNode): value is string {
  return typeof value === 'string' && value.trim() === '';
}

/**
 * react-markdown hands a component both the raw hast `node` (used upstream
 * in documentationComponents.tsx purely to *detect* the callout, via
 * tryDetectCallout) and the already-rendered React `children` (each nested
 * tag already passed through our own components map). Rebuilding a hast
 * tree here would fight that pipeline, so the marker text is stripped
 * directly out of the React tree instead — walking down through the first
 * *meaningful* child at each level (skipping the insignificant whitespace
 * text nodes React.Children.toArray preserves between block elements)
 * until a string leaf is found.
 */
function stripLeadingMarker(node: React.ReactNode, markerLength: number): React.ReactNode {
  const arr = React.Children.toArray(node);
  const index = arr.findIndex((child) => !isWhitespaceString(child));
  if (index === -1) return node;

  const target = arr[index];
  const result = [...arr];

  if (typeof target === 'string') {
    const stripped = target.slice(markerLength).replace(/^\s+/, '');
    if (stripped.length > 0) {
      result[index] = stripped;
    } else {
      result.splice(index, 1);
    }
  } else if (React.isValidElement<{ children?: React.ReactNode }>(target)) {
    result[index] = React.cloneElement(target, undefined, stripLeadingMarker(target.props.children, markerLength));
  }

  return result;
}

/** Drops the first meaningful child (the marker-only paragraph), skipping leading whitespace text nodes. */
function dropLeadingParagraph(node: React.ReactNode): React.ReactNode {
  const arr = React.Children.toArray(node);
  const index = arr.findIndex((child) => !isWhitespaceString(child));
  if (index === -1) return arr;
  const result = [...arr];
  result.splice(index, 1);
  return result;
}

export function Callout({ info, children }: { info: CalloutInfo; children: React.ReactNode }) {
  const { icon: Icon, label, accentColor } = resolveCalloutStyle(info.kind);

  const body = info.markerOnlyFirstParagraph
    ? dropLeadingParagraph(children)
    : stripLeadingMarker(children, info.markerLength);

  return (
    <div
      className="my-4 rounded-md border-l-2 py-2.5 pl-4 pr-4"
      style={{ borderLeftColor: accentColor, backgroundColor: `${accentColor}14` }}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: accentColor }}>
        <Icon size={14} />
        {label}
      </div>
      <div className="text-[13px] leading-relaxed text-[#cccccc] [&>p]:mb-2 [&>p:last-child]:mb-0">{body}</div>
    </div>
  );
}
