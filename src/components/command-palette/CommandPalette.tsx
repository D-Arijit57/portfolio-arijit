import React, { useEffect, useRef, useState } from 'react';
import { Command } from 'cmdk';
import { useStore } from '../../store/useStore';
import { allFiles } from '../../content/fileSystem';
import { FileText, FileCode2, Terminal as TerminalIcon, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { namespaceOf } from '../../search/types';
import { restoreFocusAfterCommandPaletteClose } from '../../lib/commandPaletteFocusMemory';
import { prefersReducedMotion } from '../../lib/typingReveal';

// Sprint 10G: GitHub's generated files stay fully fetchable by id (see
// useStore.ts's HIDDEN_BROWSE_NAMESPACES note — ContributionsTerminal's widgets
// depend on that) but shouldn't be listed here, since this bypasses the
// tree Explorer/Terminal already have the folder hidden from.
const paletteFiles = () => allFiles.filter((file) => namespaceOf(file) !== 'github');

export function CommandPalette() {
  const { commandPalette, setCommandPaletteOpen, openFile, toggleTerminal, toggleExplorer, toggleEditorSplit } = useStore();
  const [value, setValue] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  const closePalette = () => {
    setCommandPaletteOpen(false);
    restoreFocusAfterCommandPaletteClose();
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePalette();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCommandPaletteOpen]);

  // Phase 5: a real focus trap — cmdk keeps DOM focus on Command.Input the
  // whole time (arrow keys move a visual aria-selected state, not actual
  // focus, per its own `tabindex="-1"` on items), so in practice this
  // usually just keeps Tab from leaving that one input. Written generically
  // rather than hard-coded to "the input", so it stays correct if the
  // dialog ever gains a second real focus target.
  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusables = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!commandPalette.isOpen) return null;

  const reduceMotion = prefersReducedMotion();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm">
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
          onKeyDown={handleDialogKeyDown}
          initial={reduceMotion ? false : { opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
          transition={{ duration: reduceMotion ? 0 : 0.1 }}
          className="w-full max-w-[600px] bg-[#252526] rounded-md shadow-2xl border border-[#454545] overflow-hidden"
        >
          <Command
            value={value}
            onValueChange={setValue}
            className="w-full flex flex-col"
          >
            <div className="flex items-center px-3 border-b border-[#454545]">
              <Command.Input 
                autoFocus 
                placeholder="Type a command or search files..." 
                className="w-full bg-transparent text-[#cccccc] h-12 outline-none text-[13px] placeholder:text-[#6e6e6e]"
              />
            </div>
            
            <Command.List className="max-h-[300px] overflow-y-auto p-2 text-[13px] text-[#cccccc] scrollbar-thin">
              <Command.Empty className="py-6 text-center text-[#858585]">No results found.</Command.Empty>
              
              <Command.Group heading="Files" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-[#858585] [&_[cmdk-group-heading]]:uppercase">
                {paletteFiles().map(file => (
                  <Command.Item
                    key={file.id}
                    value={file.name}
                    onSelect={() => {
                      openFile(file.id);
                      closePalette();
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-sm aria-selected:bg-[#0060c0] aria-selected:text-white"
                  >
                    {file.type === 'markdown' ? <FileText size={14} /> : <FileCode2 size={14} />}
                    <span>{file.name}</span>
                    <span className="ml-auto text-xs text-[#858585] aria-selected:text-white/70">{file.path}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Commands" className="mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-[#858585] [&_[cmdk-group-heading]]:uppercase">
                <Command.Item
                  value="Toggle Terminal"
                  onSelect={() => {
                    toggleTerminal();
                    closePalette();
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-sm aria-selected:bg-[#0060c0] aria-selected:text-white"
                >
                  <TerminalIcon size={14} />
                  <span>Toggle Terminal</span>
                </Command.Item>
                
                <Command.Item
                  value="Toggle Explorer"
                  onSelect={() => {
                    toggleExplorer();
                    closePalette();
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-sm aria-selected:bg-[#0060c0] aria-selected:text-white"
                >
                  <Layout size={14} />
                  <span>Toggle Explorer</span>
                </Command.Item>

                <Command.Item
                  value="Toggle Split Editor"
                  onSelect={() => {
                    toggleEditorSplit();
                    closePalette();
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-sm aria-selected:bg-[#0060c0] aria-selected:text-white"
                >
                  <Layout size={14} />
                  <span>Toggle Split Editor</span>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
