import type { ImageSourcePropType } from 'react-native';
import type { Voice } from '../store';

/** call: a phone-call style screen; assistant: lives inside the app over every screen. */
export type AgentMode = 'call' | 'assistant';

export interface Persona {
  name: string;               // what the person hears and sees
  agentId: string;            // ElevenLabs agent id (public agent, no key in the app)
  avatar: ImageSourcePropType;
}

export interface AgentDef {
  key: string;
  mode: AgentMode;
  /** one persona per assistant voice the person picked in settings */
  personas: Record<Voice, Persona>;
  /** client tools this agent may run on the phone (names from src/tools) */
  clientTools: string[];
  /** true when the agent uses server (webhook) tools and needs a server session for this call */
  serverSession?: boolean;
  /** what the app does after one of the agent's server tools answers (e.g. refresh the plan) */
  afterServerTool?: Record<string, 'refreshPlan' | 'confirmPlan'>;
}
