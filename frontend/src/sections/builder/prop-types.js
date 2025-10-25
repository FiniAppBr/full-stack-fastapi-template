import PropTypes from 'prop-types';

/**
 * Shared PropTypes definitions for Builder components
 * Keeps PropTypes DRY and consistent across all components
 */

export const blockPropType = PropTypes.shape({
  id: PropTypes.number,
  block_type: PropTypes.string,
  name: PropTypes.string,
  description: PropTypes.string,
  is_active: PropTypes.bool,
  // Knowledge fields
  content: PropTypes.string,
  content_type: PropTypes.string,
  file_path: PropTypes.string,
  file_type: PropTypes.string,
  // Personality fields
  tone: PropTypes.string,
  languages: PropTypes.arrayOf(PropTypes.string),
  use_emojis: PropTypes.bool,
  emoji_frequency: PropTypes.string,
  response_length: PropTypes.string,
  constraints: PropTypes.arrayOf(PropTypes.string),
  guidelines: PropTypes.arrayOf(PropTypes.string),
  // Action fields
  action_type: PropTypes.string,
  requires_confirmation: PropTypes.bool,
  // Timestamps
  created_at: PropTypes.string,
  updated_at: PropTypes.string,
});

export const messagePropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  role: PropTypes.string,
  content: PropTypes.string,
  timestamp: PropTypes.string,
});

export const blocksPropType = PropTypes.arrayOf(blockPropType);

export const messagesPropType = PropTypes.arrayOf(messagePropType);
