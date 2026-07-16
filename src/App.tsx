/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { VSCodeShell } from './components/shell/VSCodeShell';
import { BootScreen } from './components/shell/BootScreen';
import { BootErrorScreen } from './components/shell/BootErrorScreen';
import { useStore } from './store/useStore';

export default function App() {
  const { vfsLoaded, vfsError, hydrateVFS } = useStore();

  useEffect(() => {
    hydrateVFS();
  }, [hydrateVFS]);

  if (vfsError !== null) {
    return <BootErrorScreen message={vfsError} />;
  }

  if (!vfsLoaded) {
    return <BootScreen />;
  }

  return <VSCodeShell />;
}
