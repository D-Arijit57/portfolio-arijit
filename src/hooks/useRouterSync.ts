import { useEffect, useState } from 'react';
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
  // Gates the activeFileId -> URL sync effect below until the URL -> activeFileId
  // resolution on mount has committed. Without this, both effects fire in the same
  // initial commit and the URL-derived sync can push a URL built from the store's
  // pre-navigation default activeFileId, clobbering the just-resolved deep link.
  // Set together with openFile() in the same synchronous pass so React 18 batches
  // them into one commit — the effect below can never observe this flag as true
  // while activeFileId is still the stale default.
  const [initialRouteResolved, setInitialRouteResolved] = useState(false);

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
    setInitialRouteResolved(true);

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [openFile]);

  useEffect(() => {
    if (!initialRouteResolved) return;
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
  }, [activeFileId, initialRouteResolved]);
}
