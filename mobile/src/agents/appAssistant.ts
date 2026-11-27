import type { AgentDef } from './types';

/** The assistant inside the app: moves around the app, changes settings, reads screens on the phone. */
export const appAssistant: AgentDef = {
  key: 'app-assistant',
  mode: 'assistant',
  personas: {
    f: { name: 'رُفيدة', agentId: 'agent_1501m8ef5ggye2a9q13mtb0rvkzj', avatar: require('../../assets/avatars/rufaida.png') },
    m: { name: 'رفيد', agentId: 'agent_5601m8ef72qze8yv81t5v27tfqe0', avatar: require('../../assets/avatars/rafeed.png') },
  },
  clientTools: ['open_screen', 'read_screen', 'set_text_size', 'set_app_language', 'show_on_map', 'start_call'],
};
