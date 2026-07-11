import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store/useStore';
import { X, Github, Code, Info } from 'lucide-react';

const SourceIcon = ({ source }: { source: string }) => {
  switch (source) {
    case 'GitHub': return <Github size={14} className="text-[#cccccc]" />;
    case 'LeetCode': return <Code size={14} className="text-[#ffa116]" />;
    default: return <Info size={14} className="text-[#007acc]" />;
  }
};

export function Notifications() {
  const { notifications, dismissNotification } = useStore();

  useEffect(() => {
    notifications.forEach(notif => {
      const timeAlive = Date.now() - notif.timestamp;
      if (timeAlive > 5000) {
        dismissNotification(notif.id);
      } else {
        const timeout = setTimeout(() => dismissNotification(notif.id), 5000 - timeAlive);
        return () => clearTimeout(timeout);
      }
    });
  }, [notifications, dismissNotification]);

  return (
    <div className="fixed bottom-[30px] right-4 z-50 flex flex-col gap-2 max-w-[320px]">
      <AnimatePresence>
        {notifications.map(notif => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#252526] border border-[#454545] p-3 shadow-xl rounded pointer-events-auto flex items-start"
          >
            <div className="text-[#007acc] mr-3 mt-1">
              <SourceIcon source={notif.source} />
            </div>
            <div>
              <div className="font-bold text-[12px] text-white">{notif.source}</div>
              <div className="text-[11px] text-[#cccccc] opacity-70">{notif.message}</div>
            </div>
            <button 
              onClick={() => dismissNotification(notif.id)}
              className="ml-auto opacity-50 hover:opacity-100 p-0.5 rounded transition-colors text-[#cccccc]"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
