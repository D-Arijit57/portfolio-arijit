import { Loader2 } from 'lucide-react';

export function BootScreen() {
  return (
    <div className="h-screen w-screen bg-[#1e1e1e] text-[#cccccc] flex flex-col items-center justify-center gap-4 select-none">
      <Loader2 size={32} className="text-[#007acc] animate-spin" />
      <span className="text-[13px] text-[#858585] tracking-wide">Loading workspace...</span>
    </div>
  );
}
