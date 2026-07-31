import type { GraphLeafBuildNode, GraphValidationWarning, GraphValidationWarningType } from './types';

/**
 * Pure validation checks used by buildGraph.ts. Split out from the build
 * pass itself so each check reads as a standalone rule instead of being
 * buried in the tree-construction loop — and so it's testable without
 * constructing a full GraphModel.
 */

function warning(type: GraphValidationWarningType, nodeId: string, message: string): GraphValidationWarning {
  return { type, nodeId, message };
}

/**
 * A leaf's declared `category` field is redundant with the category array
 * it's actually nested under in the source YAML. A mismatch usually means a
 * copy-paste error in the authored file — the structural nesting always
 * wins, this only warns.
 */
export function validateCategoryDeclaration(
  leaf: GraphLeafBuildNode,
  knownCategoryKeys: ReadonlySet<string>,
): GraphValidationWarning | undefined {
  if (leaf.source.category === leaf.categoryKey) return undefined;

  return knownCategoryKeys.has(leaf.source.category)
    ? warning(
        'category-mismatch',
        leaf.id,
        `Node "${leaf.id}" declares category "${leaf.source.category}" but is nested under "${leaf.categoryKey}" — using "${leaf.categoryKey}".`,
      )
    : warning(
        'missing-category',
        leaf.id,
        `Node "${leaf.id}" declares unknown category "${leaf.source.category}" — using its actual parent "${leaf.categoryKey}".`,
      );
}

function validateReferenceList(
  leaf: GraphLeafBuildNode,
  refs: string[] | undefined,
  type: 'invalid-related-node' | 'invalid-prerequisite',
  label: string,
  knownLeafIds: ReadonlySet<string>,
): GraphValidationWarning[] {
  if (!refs || refs.length === 0) return [];

  const warnings: GraphValidationWarning[] = [];
  for (const refId of refs) {
    if (refId === leaf.id) {
      warnings.push(warning('self-reference', leaf.id, `Node "${leaf.id}" lists itself as its own ${label} — ignoring.`));
      continue;
    }
    if (!knownLeafIds.has(refId)) {
      warnings.push(warning(type, leaf.id, `Node "${leaf.id}" references unknown ${label} "${refId}".`));
    }
  }
  return warnings;
}

export function validateRelatedNodes(leaf: GraphLeafBuildNode, knownLeafIds: ReadonlySet<string>): GraphValidationWarning[] {
  return validateReferenceList(leaf, leaf.source.relatedNodes, 'invalid-related-node', 'related node', knownLeafIds);
}

export function validatePrerequisites(leaf: GraphLeafBuildNode, knownLeafIds: ReadonlySet<string>): GraphValidationWarning[] {
  return validateReferenceList(leaf, leaf.source.prerequisites, 'invalid-prerequisite', 'prerequisite', knownLeafIds);
}
