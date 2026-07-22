import { InMemoryFileNodeRepository, workspaceSeed } from './repositories';
import type { FileNodeRepository } from './repositories';
import { FileSystemService, ResumePdfService } from './services';

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

// Sprint 11: stateless (no repository dependency — resume variants are a
// static in-process registry, not part of the VFS), but composed here
// alongside fileSystemService so resume.routes.ts follows the exact same
// "import a ready instance from composition" pattern as fs.routes.ts.
export const resumePdfService = new ResumePdfService();
