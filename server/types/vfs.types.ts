export type FileType =
  | 'markdown'
  | 'typescript'
  | 'python'
  | 'json'
  | 'yaml'
  | 'toml'
  | 'shell'
  | 'mermaid'
  | 'tsx';

export const FILE_TYPES: readonly FileType[] = [
  'markdown',
  'typescript',
  'python',
  'json',
  'yaml',
  'toml',
  'shell',
  'mermaid',
  'tsx',
];

export function isValidFileType(value: string): value is FileType {
  return (FILE_TYPES as readonly string[]).includes(value);
}

export interface VirtualFile {
  readonly id: string;
  readonly name: string;
  readonly type: FileType;
  readonly content: string;
  readonly path: string;
  readonly isReadonly?: boolean;
}

export interface VirtualFolder {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly children: readonly VirtualNode[];
}

export type VirtualNode = VirtualFile | VirtualFolder;

// The aggregate root — see VFS_DESIGN.md §1.3. Always a VirtualFolder with id 'root', path '/'.
export type WorkspaceTree = VirtualFolder;

// Discrimination contract per VFS_DESIGN.md §1.2/§5.6: folders never carry `content`, files always do.
export function isVirtualFile(node: VirtualNode): node is VirtualFile {
  return 'content' in node;
}
