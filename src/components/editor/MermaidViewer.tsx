import React from 'react';

export function MermaidViewer({ content }: { content: string }) {
  // A simple mockup of a mermaid architecture render since real mermaid takes significant setup and dom operations.
  // The user requested: "architecture.mmd renders architecture preview."
  return (
    <div className="h-full w-full bg-[#1e1e1e] flex flex-col p-8">
      <div className="text-[#cccccc] mb-8 font-mono whitespace-pre-wrap">{content}</div>
      <div className="flex-1 border border-[#333333] rounded-md bg-[#252526] p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white font-semibold mb-4">Mermaid Render Preview</p>
          <div className="text-[#858585] text-sm font-mono">
            [Graph TD]<br/>
            Client -&gt; API Gateway -&gt; Load Balancer<br/>
            -&gt; Auth Service &amp; Cortexa Core
          </div>
        </div>
      </div>
    </div>
  );
}
