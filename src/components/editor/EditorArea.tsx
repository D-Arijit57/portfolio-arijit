import React from 'react';
import { useStore } from '../../store/useStore';
import { EditorTabs } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';
import { EditorRenderer } from './EditorRenderer';
import { SplitEditorArea } from './SplitEditorArea';
import { getFileById } from '../../content/fileSystem';

export function EditorArea() {
  const { editorSplit } = useStore();

  if (editorSplit) {
    return <SplitEditorArea />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#1e1e1e]">
      <EditorTabs pane="left" />
      <Breadcrumbs pane="left" />
      <div className="flex-1 overflow-hidden">
        <EditorRenderer pane="left" />
      </div>
    </div>
  );
}
