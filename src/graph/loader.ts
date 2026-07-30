import { parse } from 'yaml';
import type { GraphCategory, GraphModel, GraphNode, GraphNodeProficiency } from './types';

/**
 * Knowledge Graph Loader — pure function: raw YAML text in, a typed
 * GraphModel out (or undefined if the text isn't a usable graph). No
 * React, no side effects, same purity contract as parseManifest()
 * (src/manifest/parser.ts).
 *
 * Unlike the manifest (JSON embedded in a .yaml-named file, to avoid a
 * parser dependency), this file's source is real YAML — an explicit,
 * approved trade-off: `skills.graph` is meant to read as a genuine
 * developer-maintained file, which JSON-flow-style text would undermine.
 */

const PROFICIENCY_VALUES = new Set<GraphNodeProficiency>(['beginner', 'intermediate', 'advanced', 'expert']);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isGraphNode(value: unknown): value is GraphNode {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  if (typeof v.id !== 'string' || typeof v.name !== 'string' || typeof v.category !== 'string') return false;
  if (v.icon !== undefined && typeof v.icon !== 'string') return false;
  if (v.description !== undefined && typeof v.description !== 'string') return false;
  if (v.proficiency !== undefined && !PROFICIENCY_VALUES.has(v.proficiency as GraphNodeProficiency)) return false;
  if (v.proficiencyPercent !== undefined && typeof v.proficiencyPercent !== 'number') return false;
  if (v.years !== undefined && typeof v.years !== 'number') return false;
  if (v.isCore !== undefined && typeof v.isCore !== 'boolean') return false;
  if (v.projects !== undefined && !isStringArray(v.projects)) return false;
  if (v.relatedNodes !== undefined && !isStringArray(v.relatedNodes)) return false;
  if (v.prerequisites !== undefined && !isStringArray(v.prerequisites)) return false;
  if (v.strengths !== undefined && !isStringArray(v.strengths)) return false;
  if (v.documentation !== undefined && typeof v.documentation !== 'string') return false;
  if (v.tags !== undefined && !isStringArray(v.tags)) return false;
  if (v.notes !== undefined && typeof v.notes !== 'string') return false;

  return true;
}

function isGraphCategory(value: unknown): value is GraphCategory {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.key !== 'string' || typeof v.title !== 'string') return false;
  return Array.isArray(v.nodes);
}

export function loadGraphModel(raw: string): GraphModel | undefined {
  let data: unknown;
  try {
    data = parse(raw);
  } catch {
    return undefined;
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) return undefined;
  const obj = data as Record<string, unknown>;

  if (typeof obj.title !== 'string' || !Array.isArray(obj.categories)) return undefined;
  const description = typeof obj.description === 'string' ? obj.description : '';

  const categories: GraphCategory[] = [];
  for (const rawCategory of obj.categories) {
    if (!isGraphCategory(rawCategory)) continue;
    const nodes = (rawCategory.nodes as unknown[]).filter(isGraphNode);
    if (nodes.length === 0) continue;
    categories.push({ key: rawCategory.key, title: rawCategory.title, nodes });
  }

  return { title: obj.title, description, categories };
}
