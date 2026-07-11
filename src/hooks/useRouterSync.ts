import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { allFiles, getFileById } from '../content/fileSystem';

export function resolveUrlPathToFile(pathname: string) {
  if (!pathname.startsWith('/journey')) return undefined;
  let path = pathname.replace('/journey', '');
  if (path === '' || path === '/') return getFileById('readme');
  
  const normalizedPath = path.toLowerCase();
  
  return allFiles.find(f => {
    const fPath = f.path.toLowerCase();
    return fPath === normalizedPath || 
           fPath === normalizedPath + '.md' || 
           fPath === normalizedPath + '.ts' ||
           fPath === normalizedPath + '.py' ||
           fPath === normalizedPath + '.json' ||
           fPath === normalizedPath + '.yaml' ||
           fPath === normalizedPath + '.yml' ||
           fPath === normalizedPath + '.mmd' ||
           fPath === normalizedPath + '.sh' ||
           fPath === normalizedPath + '/readme.md' ||
           fPath === normalizedPath + '/profile.md' ||
           fPath === normalizedPath + '/work_history.ts' ||
           fPath === normalizedPath + '/contact.sh';
  });
}

export function useRouterSync() {
  const { activeFileId, openFile } = useStore();

  useEffect(() => {
    const handlePopState = () => {
      const file = resolveUrlPathToFile(window.location.pathname);
      if (file) {
        openFile(file.id);
      }
    };

    // Initialize on mount
    if (window.location.pathname !== '/' && window.location.pathname.startsWith('/journey')) {
      handlePopState();
    } else if (window.location.pathname === '/') {
      window.history.replaceState(null, '', '/journey/readme');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [openFile]);

  useEffect(() => {
    if (activeFileId) {
      const file = getFileById(activeFileId);
      if (file) {
        let newPath = '/journey' + file.path.toLowerCase();
        newPath = newPath.replace(/\.(md|ts|py|json|yaml|yml|sh|mmd)$/, '');
        
        // Custom cleanups based on user request
        if (newPath === '/journey/about/profile') newPath = '/journey/about';
        if (newPath === '/journey/experience/work_history') newPath = '/journey/experience';
        if (newPath === '/journey/contact/contact') newPath = '/journey/contact';
        
        if (window.location.pathname !== newPath) {
          window.history.pushState(null, '', newPath);
        }
      }
    }
  }, [activeFileId]);
}
