import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { allFiles } from '../../content/fileSystem';

export function Terminal() {
  const { terminalState, addTerminalHistory, clearTerminal, openFile } = useStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [terminalState.history]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      addTerminalHistory(trimmed, '');
      return;
    }

    const args = trimmed.split(' ');
    const command = args[0].toLowerCase();
    
    let output = '';

    switch (command) {
      case 'help':
        output = 'Available commands:\n' +
                 '  help      - Show this help message\n' +
                 '  ls        - List virtual files\n' +
                 '  clear     - Clear terminal screen\n' +
                 '  open      - Open a specific file (e.g., "open about")\n' +
                 '  about     - Navigate to About\n' +
                 '  experience- Navigate to Experience\n' +
                 '  skills    - Navigate to Skills\n' +
                 '  contact   - Navigate to Contact\n' +
                 '  cat       - View file contents (e.g., "cat README.md")\n' + 
                 '  npm       - Try "npm run about" or "npm run experience"';
        break;
      case 'ls':
        output = allFiles.map(f => f.name).join('  ');
        break;
      case 'clear':
        clearTerminal();
        return;
      case 'about':
        openFile('profile');
        output = 'Opening about...';
        break;
      case 'experience':
        openFile('work_history');
        output = 'Opening experience...';
        break;
      case 'skills':
        openFile('skills_frontend');
        output = 'Opening skills...';
        break;
      case 'contact':
        openFile('contact_sh');
        output = 'Opening contact...';
        break;
      case 'open':
        if (args[1]) {
          let targetId = args[1].toLowerCase();
          if (targetId === 'about') targetId = 'profile';
          if (targetId === 'experience') targetId = 'work_history';
          if (targetId === 'skills') targetId = 'skills_frontend';
          if (targetId === 'contact') targetId = 'contact_sh';
          if (targetId === 'projects' || targetId === 'cortexa') targetId = 'cortexa_readme';

          const target = allFiles.find(f => f.name.toLowerCase().includes(targetId) || f.id === targetId);
          if (target) {
            openFile(target.id);
            output = `Opened ${target.name}`;
          } else {
            output = `File not found: ${args[1]}`;
          }
        } else {
          output = 'Usage: open <filename>';
        }
        break;
      case 'cat':
        if (args[1]) {
          const target = allFiles.find(f => f.name.toLowerCase() === args[1].toLowerCase());
          if (target) {
            output = target.content.slice(0, 500) + (target.content.length > 500 ? '\n... [truncated]' : '');
          } else {
            output = `cat: ${args[1]}: No such file or directory`;
          }
        } else {
          output = 'Usage: cat <filename>';
        }
        break;
      case 'npm':
        if (args[1] === 'run' && args[2]) {
          const targetName = args[2].toLowerCase();
          const target = allFiles.find(f => f.name.toLowerCase().includes(targetName) || f.id.includes(targetName));
          if (target) {
            openFile(target.id);
            output = `> portfolio@1.0.0 ${args[2]}\n> Opening ${target.name}...`;
          } else {
            output = `npm ERR! missing script: ${args[2]}`;
          }
        } else {
          output = 'Usage: npm run <script>';
        }
        break;
      case 'cd':
      case 'pwd':
        output = '/home/visitor/workspace';
        break;
      default:
        output = `bash: ${command}: command not found`;
    }

    addTerminalHistory(trimmed, output);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCommand(input);
    setInput('');
  };

  if (!terminalState.isOpen) return null;

  return (
    <div className="h-[200px] border-t border-[#3c3c3c] bg-[#1e1e1e] flex flex-col font-mono text-[13px] shrink-0">
      <div className="flex px-4 pt-2 space-x-6 text-[11px] font-bold uppercase text-[#858585]">
        <span className="text-white border-b-2 border-white pb-1 cursor-pointer">Terminal</span>
        <span className="hover:text-white cursor-pointer pb-1 border-b-2 border-transparent">Output</span>
        <span className="hover:text-white cursor-pointer pb-1 border-b-2 border-transparent">Debug Console</span>
        <span className="hover:text-white cursor-pointer pb-1 border-b-2 border-transparent">Problems</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-[#cccccc]" onClick={() => inputRef.current?.focus()}>
        {terminalState.history.map((entry, i) => (
          <div key={i} className="mb-2 whitespace-pre-wrap">
            {entry.command && (
              <div className="flex">
                <span className="text-[#3572A5] mr-2">visitor@journey:~/workspace$</span>
                <span>{entry.command}</span>
              </div>
            )}
            {entry.output && <div className="text-[#cccccc]">{entry.output}</div>}
          </div>
        ))}
        <form onSubmit={onSubmit} className="flex">
          <span className="text-[#3572A5] mr-2">visitor@journey:~/workspace$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-transparent outline-none border-none text-[#cccccc]"
            autoFocus
          />
        </form>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
