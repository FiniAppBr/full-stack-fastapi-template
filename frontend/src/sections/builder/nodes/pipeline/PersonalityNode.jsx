import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { BaseNode } from '../BaseNode';
import { getStatLineStyles } from '../../utils/node-styles';
import { Iconify } from 'src/components/iconify';

/**
 * Personality Pipeline Node
 * Shows message formatting, tone, and style configuration (read-only visualization)
 */
export function PersonalityNode({ data }) {
  const stats = data?.stats || {};

  return (
    <BaseNode
      id={data.id}
      type="pipeline"
      icon="mdi:palette"
      title="Personalidade"
      tooltip="Tom, formato e estilo das mensagens"
      editable={false}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Como o AI se comunica: tom, emojis, formatação
      </Typography>

      {stats.lastRun && (
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mb: 1,
              display: 'block',
              fontWeight: (theme) => theme.typography.fontWeightSemiBold,
            }}
          >
            Última execução:
          </Typography>

          <Box sx={getStatLineStyles()}>
            <Iconify icon="mdi:emoticon" width={16} sx={{ color: 'warning.main' }} />
            <Typography variant="caption">
              {stats.tone || 'Casual e amigável'}
            </Typography>
          </Box>

          {stats.emojiCount !== undefined && (
            <Box sx={getStatLineStyles()}>
              <Iconify icon="mdi:sticker-emoji" width={16} sx={{ color: 'success.main' }} />
              <Typography variant="caption">
                {stats.emojiCount} emojis usados
              </Typography>
            </Box>
          )}

          {stats.messageLength && (
            <Box sx={getStatLineStyles()}>
              <Iconify icon="mdi:text" width={16} sx={{ color: 'info.main' }} />
              <Typography variant="caption">
                {stats.messageLength} caracteres
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

PersonalityNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    stats: PropTypes.shape({
      lastRun: PropTypes.bool,
      tone: PropTypes.string,
      emojiCount: PropTypes.number,
      messageLength: PropTypes.number,
    }),
  }).isRequired,
};
