// lib/agents/memory-persistence.ts
// Persistent memory that survives server restarts
// Stores agent memory and operator profile on disk

import { createDefaultMemory } from './ghostface-agent';
import type { AgentMemory } from './types';
import fs from 'fs/promises';
import path from 'path';

const MEMORY_FILE = '/home/workspace/.ghostface_memory.json';
const OPERATOR_FILE = '/home/workspace/.ghostface_operator.json';

export async function loadMemory(): Promise<AgentMemory> {
  try {
    const data = await fs.readFile(MEMORY_FILE, 'utf-8');
    const saved = JSON.parse(data);
    return { ...createDefaultMemory(), ...saved };
  } catch {
    return createDefaultMemory();
  }
}

export async function saveMemory(memory: AgentMemory): Promise<void> {
  await fs.writeFile(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf-8');
}

export interface OperatorProfile {
  name: string;
  github: string;
  youtubeChannel?: string;
  niche: string;
  preferences: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export async function loadOperator(): Promise<OperatorProfile | null> {
  try {
    const data = await fs.readFile(OPERATOR_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveOperator(profile: OperatorProfile): Promise<void> {
  await fs.writeFile(OPERATOR_FILE, JSON.stringify(profile, null, 2), 'utf-8');
}

export async function mergeMemoryUpdate(
  current: AgentMemory,
  updates: Partial<AgentMemory>,
): Promise<AgentMemory> {
  const merged = { ...current, ...updates, lastUpdated: new Date().toISOString() };
  await saveMemory(merged);
  return merged;
}
