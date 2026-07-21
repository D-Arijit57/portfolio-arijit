import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store/useStore';
import { notificationService } from '../../notifications/notificationService';
import type { Notification, NotificationSeverity } from '../../notifications/types';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Pure renderer (ARCHITECTURE.md "Notification Service" §6). Subscribes to
 * store.notificationState only, renders exactly what it's given, in the
 * order it's given. Owns layout/animation/hover-detection — never ordering,
 * timers, or overflow, which live in src/notifications/notificationQueue.ts.
 */

const SEVERITY_ICON: Record<NotificationSeverity, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-[#89d185]" />,
  info: <Info size={16} className="text-[#3794ff]" />,
  warning: <AlertTriangle size={16} className="text-[#cca700]" />,
  error: <XCircle size={16} className="text-[#f14c4c]" />,
};

const SEVERITY_BAR_COLOR: Record<NotificationSeverity, string> = {
  success: 'bg-[#89d185]',
  info: 'bg-[#3794ff]',
  warning: 'bg-[#cca700]',
  error: 'bg-[#f14c4c]',
};

export function Notifications() {
  const { notificationState, bootActive } = useStore();

  // Sprint 10E.2: suppressed while the boot terminal is active — a
  // "Workspace indexed" toast popping up mid-boot breaks the illusion that
  // the workspace is still initializing. The queue/timers underneath keep
  // running as normal; whatever's still visible once boot ends renders then.
  if (bootActive) return null;

  return (
    <div className="fixed bottom-[30px] right-4 z-50 flex flex-col gap-2 max-w-[320px] pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notificationState.visible.map((notification) => (
          <NotificationToast key={notification.id} notification={notification} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationToast({ notification }: { notification: Notification }) {
  const [barPhase, setBarPhase] = useState<'idle' | 'running' | 'paused'>('idle');
  const [pausedWidthPercent, setPausedWidthPercent] = useState(100);
  const remainingMsRef = useRef(notification.duration ?? 0);
  const barTrackRef = useRef<HTMLDivElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);

  // A dedupe refresh keeps this notification's id but bumps its timestamp —
  // restart the visual countdown to match the queue's restarted timer.
  useEffect(() => {
    if (notification.duration === null) return;
    remainingMsRef.current = notification.duration;
    setBarPhase('idle');
    const raf = requestAnimationFrame(() => setBarPhase('running'));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.id, notification.timestamp, notification.duration]);

  const handleMouseEnter = () => {
    if (notification.duration === null) return;

    const trackWidth = barTrackRef.current?.getBoundingClientRect().width ?? 0;
    const barWidth = barFillRef.current?.getBoundingClientRect().width ?? 0;
    const remainingFraction = trackWidth > 0 ? barWidth / trackWidth : 0;
    remainingMsRef.current = Math.max(0, remainingFraction * notification.duration);

    setPausedWidthPercent(remainingFraction * 100);
    setBarPhase('paused');
    notificationService.pause(notification.id);
  };

  const handleMouseLeave = () => {
    if (notification.duration === null) return;

    setBarPhase('idle');
    const raf = requestAnimationFrame(() => setBarPhase('running'));
    notificationService.resume(notification.id);
    return () => cancelAnimationFrame(raf);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="bg-[#252526] border border-[#454545] shadow-xl rounded pointer-events-auto overflow-hidden"
    >
      <div className="p-3 flex items-start">
        <div className="mr-3 mt-0.5 shrink-0">{SEVERITY_ICON[notification.severity]}</div>
        <div className="min-w-0">
          <div className="font-bold text-[12px] text-white truncate">{notification.title}</div>
          {notification.message && (
            <div className="text-[11px] text-[#cccccc] opacity-70 break-words">{notification.message}</div>
          )}
          <div className="text-[10px] text-[#858585] mt-0.5">{notification.source}</div>
        </div>
        {notification.dismissible && (
          <button
            onClick={() => notificationService.dismiss(notification.id)}
            className="ml-auto opacity-50 hover:opacity-100 p-0.5 rounded transition-colors text-[#cccccc] shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {notification.duration !== null && (
        <div ref={barTrackRef} className="h-[2px] w-full bg-white/10">
          <div
            ref={barFillRef}
            className={cn('h-full', SEVERITY_BAR_COLOR[notification.severity])}
            style={{
              width: barPhase === 'running' ? '0%' : barPhase === 'paused' ? `${pausedWidthPercent}%` : '100%',
              transition: barPhase === 'running' ? `width ${remainingMsRef.current}ms linear` : 'none',
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
