// All client tools by name. An agent lists the names it may use in its AgentDef.
import { appTools } from './app';
import type { Tool, ToolContext } from './types';

export const TOOLS: Record<string, Tool> = { ...appTools };

/** The clientTools object for one agent session, bound to that session. */
export function toolsFor(names: string[], ctx: ToolContext) {
  const out: Record<string, (p: Record<string, unknown>) => Promise<string | void>> = {};
  for (const n of names) {
    const tool = TOOLS[n];
    if (!tool) throw new Error('agent lists an unknown client tool: ' + n);
    out[n] = async (p) => tool(p ?? {}, ctx);
  }
  return out;
}

export type { Tool, ToolContext } from './types';
