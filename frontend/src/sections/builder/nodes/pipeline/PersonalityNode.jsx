import PropTypes from 'prop-types';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { PIPELINE_NODE_CONFIG } from '../../utils/node-styles';
import { BaseNode } from '../BaseNode';

/**
 * Personality Pipeline Node
 * Shows message formatting, tone, and style configuration (read-only visualization)
 */
export function PersonalityNode({ data }) {
  const { tone, useEmojis, multiTurnEnabled, blockCount } = data || {};

  return (
    <BaseNode
      id={data.id}
      type="pipeline"
      pipelineType="personality"
      icon="lucide:message-square-text"
      title="Personalidade"
      tooltip="Tom, formato e estilo das mensagens"
      editable={false}
      iconSize={PIPELINE_NODE_CONFIG.iconSize}
      iconColor={PIPELINE_NODE_CONFIG.iconColor}
      rightHandle
    >
      <Stack spacing={1}>
        {/* Pills */}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
          {tone && (
            <Chip
              label={`Tom: ${tone}`}
              size="small"
              sx={{
                bgcolor: 'secondary.lighter',
                color: 'secondary.dark',
                fontWeight: (theme) => theme.typography.fontWeightMedium,
              }}
            />
          )}
          {useEmojis !== undefined && (
            <Chip
              label={useEmojis ? 'Emojis' : 'Sem emojis'}
              size="small"
              sx={{
                bgcolor: 'warning.lighter',
                color: 'warning.dark',
                fontWeight: (theme) => theme.typography.fontWeightMedium,
              }}
            />
          )}
          {multiTurnEnabled && (
            <Chip
              label="Multi-turno"
              size="small"
              sx={{
                bgcolor: 'success.lighter',
                color: 'success.dark',
                fontWeight: (theme) => theme.typography.fontWeightMedium,
              }}
            />
          )}
        </Stack>

        {/* Block count */}
        {blockCount !== undefined && (
          <Typography variant="caption" color="text.secondary">
            {blockCount} {blockCount === 1 ? 'bloco' : 'blocos'}
          </Typography>
        )}
      </Stack>
    </BaseNode>
  );
}

PersonalityNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    tone: PropTypes.string,
    useEmojis: PropTypes.bool,
    multiTurnEnabled: PropTypes.bool,
    blockCount: PropTypes.number,
  }).isRequired,
};
