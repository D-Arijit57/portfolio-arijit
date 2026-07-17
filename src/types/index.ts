export type FileType = 'markdown' | 'typescript' | 'python' | 'json' | 'yaml' | 'toml' | 'shell' | 'mermaid' | 'tsx';

export interface VirtualFile {
  id: string;
  name: string;
  type: FileType;
  content: string;
  path: string;
  isReadonly?: boolean;
}

export interface VirtualFolder {
  id: string;
  name: string;
  path: string;
  children: (VirtualFile | VirtualFolder)[];
}

export type ExplorerNode = VirtualFile | VirtualFolder;

export interface EditorTab {
  id: string;
  fileId: string;
  pane: 'left' | 'right';
}

export interface Notification {
  id: string;
  source: 'GitHub' | 'LeetCode' | 'System';
  message: string;
  timestamp: number;
}
