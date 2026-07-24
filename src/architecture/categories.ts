import type { ArchitectureCategory } from './types';

/**
 * Single source of truth for category styling (ARCHITECTURE_PLATFORM_DESIGN.md
 * §4). Every renderer looks up icon/color through this table — none of them
 * hardcode styling per project or per node.
 */
export interface CategoryStyle {
  icon: string;
  accentColor: string;
}

export const CATEGORY_STYLES: Record<ArchitectureCategory, CategoryStyle> = {
  client: { icon: 'Monitor', accentColor: '#569cd6' },
  frontend: { icon: 'LayoutPanelLeft', accentColor: '#4ec9b0' },
  gateway: { icon: 'Waypoints', accentColor: '#c586c0' },
  backend: { icon: 'Server', accentColor: '#dcdcaa' },
  ai: { icon: 'BrainCircuit', accentColor: '#ff3670' },
  auth: { icon: 'ShieldCheck', accentColor: '#ce9178' },
  queue: { icon: 'ListOrdered', accentColor: '#d7ba7d' },
  database: { icon: 'Database', accentColor: '#569cd6' },
  infrastructure: { icon: 'Cloud', accentColor: '#9cdcfe' },
  storage: { icon: 'HardDrive', accentColor: '#b5cea8' },
  messaging: { icon: 'MessagesSquare', accentColor: '#d7ba7d' },
  external: { icon: 'ExternalLink', accentColor: '#858585' },
};
