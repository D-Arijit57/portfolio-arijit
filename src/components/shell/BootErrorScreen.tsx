import { AlertTriangle } from 'lucide-react';

interface BootErrorScreenProps {
  message: string;
}

export function BootErrorScreen({ message }: BootErrorScreenProps) {
  return (
    <div className="h-screen w-screen bg-[#1e1e1e] text-[#cccccc] flex flex-col items-center justify-center gap-3 select-none px-6">
      <AlertTriangle size={32} className="text-[#f14c4c]" />
      <span className="text-[13px] font-semibold">Failed to load workspace</span>
      <span className="text-[12px] text-[#858585] text-center max-w-md">{message}</span>
    </div>
  );
}
