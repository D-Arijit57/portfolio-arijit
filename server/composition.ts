import { InMemoryFileNodeRepository, workspaceSeed } from './repositories';
import type { FileNodeRepository } from './repositories';
import { FileSystemService } from './services';

/**
 * Composition root for the VFS layer. The single place that wires a concrete
 * FileNodeRepository into FileSystemService (VFS_DESIGN.md §3/§4). Previously
 * inlined in fs.routes.ts; extracted so the route layer and the provider
 * bootstrap (server/providers) share the same repository instance —
 * ContentProviders write through FileNodeRepository.reconcileGeneratedSubtree
 * exactly like the route layer reads/writes through FileSystemService.
 */
export const repository: FileNodeRepository = new InMemoryFileNodeRepository(workspaceSeed);
export const fileSystemService = new FileSystemService(repository);
