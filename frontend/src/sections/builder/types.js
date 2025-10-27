/**
 * Builder AI Types
 * Based on backend models from docs/models-complete.txt
 */

// Block Types (discriminator)
export const BLOCK_TYPES = {
  KNOWLEDGE: 'knowledge',
  PERSONALITY: 'personality',
  ACTION: 'action',
};

// Block Icons & Colors
export const BLOCK_CONFIG = {
  [BLOCK_TYPES.KNOWLEDGE]: {
    icon: 'solar:book-bold',
    color: 'info',
    label: 'Knowledge',
  },
  [BLOCK_TYPES.PERSONALITY]: {
    icon: 'carbon:user-avatar',
    color: 'secondary',
    label: 'Personality',
  },
  [BLOCK_TYPES.ACTION]: {
    icon: 'carbon:calendar',
    color: 'success',
    label: 'Actions',
  },
};

// Message Roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
};

/**
 * @typedef {Object} Block
 * @property {number} id
 * @property {string} block_type - 'knowledge' | 'personality' | 'action'
 * @property {string} name
 * @property {string} [description]
 * @property {boolean} is_active
 * @property {string} created_at
 * @property {string} updated_at
 *
 * Knowledge fields:
 * @property {string} [content]
 * @property {string} [content_type] - 'text' | 'pdf' | 'faq'
 * @property {string} [file_path]
 * @property {string} [file_type]
 *
 * Personality fields:
 * @property {string} [tone] - 'friendly' | 'professional' | 'casual'
 * @property {string[]} [languages]
 * @property {boolean} [use_emojis]
 * @property {string} [emoji_frequency] - 'low' | 'medium' | 'high'
 * @property {string} [response_length] - 'short' | 'medium' | 'long'
 * @property {string[]} [constraints]
 * @property {string[]} [guidelines]
 * @property {Object[]} [example_conversations]
 *
 * Action fields:
 * @property {string} [action_type] - 'appointment' | 'payment' | 'form'
 * @property {Object} [config]
 * @property {string} [integration_id]
 * @property {Object} [trigger_conditions]
 * @property {boolean} [requires_confirmation]
 *
 * Shared:
 * @property {Object} [metadata_]
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} role - 'user' | 'assistant' | 'system'
 * @property {string} content
 * @property {string} timestamp
 * @property {Object} [attachments] - File uploads
 */

/**
 * @typedef {Object} BuilderState
 * @property {Block[]} blocks
 * @property {Message[]} messages
 * @property {boolean} loading
 * @property {number|null} expandedBlock
 */

// Mock block templates for quick add
export const BLOCK_TEMPLATES = {
  knowledge_menu: {
    block_type: BLOCK_TYPES.KNOWLEDGE,
    name: 'Menu Items',
    content_type: 'text',
    content: '',
    is_active: true,
  },
  knowledge_hours: {
    block_type: BLOCK_TYPES.KNOWLEDGE,
    name: 'Hours & Location',
    content_type: 'text',
    content: '',
    is_active: true,
  },
  personality_friendly: {
    block_type: BLOCK_TYPES.PERSONALITY,
    name: 'Friendly Tone',
    tone: 'friendly',
    languages: ['en', 'pt'],
    use_emojis: true,
    emoji_frequency: 'medium',
    response_length: 'medium',
    is_active: true,
  },
  action_reservation: {
    block_type: BLOCK_TYPES.ACTION,
    name: 'Book Reservation',
    action_type: 'appointment',
    requires_confirmation: true,
    is_active: true,
  },
};
