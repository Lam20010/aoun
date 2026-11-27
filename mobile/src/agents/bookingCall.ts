import type { AgentDef } from './types';

/** The booking call: asks for location, finds the nearest time, solves the reason, books. */
export const bookingCall: AgentDef = {
  key: 'booking-call',
  mode: 'call',
  personas: {
    f: { name: 'رُفيدة', agentId: 'agent_9701m8d18596fbv8ghbf9jk4we3c', avatar: require('../../assets/avatars/rufaida.png') },
    m: { name: 'رفيد', agentId: 'agent_3801m8d1800xe1dbvm93n5dg3gay', avatar: require('../../assets/avatars/rafeed.png') },
  },
  clientTools: [],
  serverSession: true,
  afterServerTool: {
    get_appointment: 'refreshPlan', get_solutions: 'refreshPlan', request_transport: 'refreshPlan',
    set_preferences: 'refreshPlan', confirm_booking: 'confirmPlan',
  },
};
