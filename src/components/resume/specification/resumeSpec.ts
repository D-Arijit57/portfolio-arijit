import type { CSSProperties } from 'react';

/**
 * Sprint 10F.4: the Document Specification — the resume's entire visual
 * design language (typography, spacing, page geometry, color, divider
 * style) as one typed, importable object, calibrated against the uploaded
 * Arijit_Das_Resume.pdf (the canonical design reference). ResumeRenderer.tsx
 * consumes these values and owns none of its own — every font size,
 * margin, and spacing constant lives here exactly once. Changing the
 * resume's look means editing this file, never adding a new arbitrary
 * value inside JSX.
 *
 * This is presentation only. Content (experience, projects, skills, ...)
 * stays entirely in content/resume.ts — this file has no opinion on what
 * the resume says, only on how anything is displayed.
 */

export interface ResumeTextStyle {
  sizePx: number;
  lineHeight?: number;
  weight?: number;
  trackingEm?: number;
}

export interface ResumeDocumentSpec {
  page: {
    widthPx: number;
    heightPx: number;
    paddingXPx: number;
    paddingYPx: number;
  };
  fontFamily: string;
  colors: {
    background: string;
    text: string;
    divider: string;
  };
  typography: {
    name: ResumeTextStyle;
    contactLine: ResumeTextStyle;
    sectionHeading: ResumeTextStyle;
    body: ResumeTextStyle;
    summary: ResumeTextStyle;
    skillsList: ResumeTextStyle;
    bullet: ResumeTextStyle;
  };
  spacing: {
    contactLineMarginTopPx: number;
    sectionHeadingMarginTopPx: number;
    sectionHeadingMarginBottomPx: number;
    sectionHeadingPaddingBottomPx: number;
    rowGapPx: number;
    bulletListMarginTopPx: number;
    bulletItemSpacingPx: number;
    bulletMarkerGapPx: number;
    bulletIndentPx: number;
  };
  divider: {
    widthPx: number;
  };
}

export const resumeDocumentSpec: ResumeDocumentSpec = {
  page: { widthPx: 794, heightPx: 1123, paddingXPx: 52, paddingYPx: 46 },
  fontFamily: "Georgia, 'Times New Roman', Times, serif",
  colors: { background: '#ffffff', text: '#000000', divider: '#000000' },
  typography: {
    name: { sizePx: 30, weight: 700, trackingEm: 0.12 },
    contactLine: { sizePx: 11 },
    sectionHeading: { sizePx: 13, weight: 700, trackingEm: 0.08 },
    body: { sizePx: 11.5, lineHeight: 1.4 },
    summary: { sizePx: 11, lineHeight: 1.42 },
    skillsList: { sizePx: 11, lineHeight: 1.5 },
    bullet: { sizePx: 11, lineHeight: 1.38 },
  },
  spacing: {
    contactLineMarginTopPx: 4,
    sectionHeadingMarginTopPx: 14,
    sectionHeadingMarginBottomPx: 6,
    sectionHeadingPaddingBottomPx: 2,
    rowGapPx: 16,
    bulletListMarginTopPx: 2,
    bulletItemSpacingPx: 2,
    bulletMarkerGapPx: 6,
    bulletIndentPx: 2,
  },
  divider: { widthPx: 1 },
};

/** Page geometry, re-exported as plain numbers for callers that do arithmetic with it (ResumeScene's paper aspect ratio, resumeCapture's PDF aspect ratio) rather than full styling. */
export const RESUME_PAGE_WIDTH_PX = resumeDocumentSpec.page.widthPx;
export const RESUME_PAGE_HEIGHT_PX = resumeDocumentSpec.page.heightPx;

/** Converts a spec text style into inline CSS — the one place `sizePx`/`trackingEm` become `fontSize`/`letterSpacing`. */
export function textStyle(style: ResumeTextStyle): CSSProperties {
  return {
    fontSize: style.sizePx,
    lineHeight: style.lineHeight,
    fontWeight: style.weight,
    letterSpacing: style.trackingEm !== undefined ? `${style.trackingEm}em` : undefined,
  };
}

/** The resume's one divider treatment (section-heading underlines), spec-driven rather than a Tailwind `border-black` literal. */
export function dividerStyle(spec: ResumeDocumentSpec): CSSProperties {
  return {
    borderBottomWidth: spec.divider.widthPx,
    borderBottomStyle: 'solid',
    borderBottomColor: spec.colors.divider,
  };
}
