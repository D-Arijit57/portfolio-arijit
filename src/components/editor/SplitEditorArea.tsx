import React from 'react';
import { EditorTabs } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';
import { EditorRenderer } from './EditorRenderer';
import { useStore } from '../../store/useStore';

export function SplitEditorArea() {
  const { openedTabs } = useStore();
  const leftTabs = openedTabs.filter(t => t.pane === 'left');
  const rightTabs = openedTabs.filter(t => t.pane === 'right');

  return (
    <div className="flex flex-1 min-h-0 bg-[#1e1e1e]">
      {/* Left Pane */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-[#3c3c3c]">
        <EditorTabs pane="left" />
        <Breadcrumbs pane="left" />
        <div className="flex-1 overflow-hidden">
          {leftTabs.length > 0 ? (
            <EditorRenderer pane="left" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[#333333]">
              <div className="text-9xl opacity-20">VS</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Right Pane */}
      <div className="flex flex-col flex-1 min-w-0">
        <EditorTabs pane="right" />
        <Breadcrumbs pane="right" />
        <div className="flex-1 overflow-hidden">
          {rightTabs.length > 0 ? (
            <EditorRenderer pane="right" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[#333333]">
              <div className="text-9xl opacity-20">VS</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
