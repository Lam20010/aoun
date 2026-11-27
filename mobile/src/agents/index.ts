// Every agent the app knows. To add one: create a file like appAssistant.ts and list it here.
import { appAssistant } from './appAssistant';
import { bookingCall } from './bookingCall';
import type { AgentDef } from './types';

export const AGENTS: AgentDef[] = [bookingCall, appAssistant];

export function getAgent(key: string): AgentDef {
  const a = AGENTS.find((x) => x.key === key);
  if (!a) throw new Error('unknown agent ' + key);
  return a;
}

export type { AgentDef, AgentMode, Persona } from './types';
