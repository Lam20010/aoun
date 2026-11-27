export interface ToolContext {
  /** mute or unmute the microphone of the running agent */
  setMicMuted: (muted: boolean) => void;
  /** end the running agent session */
  endSession: () => void;
  /** start another agent by key (e.g. the assistant hands over to the booking call) */
  startAgent: (key: string) => void;
}

export type Tool = (params: Record<string, unknown>, ctx: ToolContext) => Promise<string | void> | string | void;
