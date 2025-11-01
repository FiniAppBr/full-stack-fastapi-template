import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { BaseNode } from '../BaseNode';
import { getStatLineStyles } from '../../utils/node-styles';
import { Iconify } from 'src/components/iconify';

/**
 * Output Pipeline Node
 * Shows formatting and media stats (read-only visualization)
 */
export function OutputNode({ data }) {
  const stats = data?.stats || {};

  return (
    <BaseNode
      id={data.id}
      type="pipeline"
      icon="mdi:send"
      title="Saída"
      tooltip="Formato e anexos da resposta"
      editable={false}
      sourceHandle={false} // Last node, no output
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Formato e anexos da resposta
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
            <Iconify icon="mdi:message-text" width={16} sx={{ color: 'primary.main' }} />
            <Typography variant="caption">
              {stats.messagesSent || 1} mensagens enviadas
            </Typography>
          </Box>

          {stats.mediaAttached > 0 && (
            <Box sx={getStatLineStyles()}>
              <Iconify icon="mdi:paperclip" width={16} sx={{ color: 'warning.main' }} />
              <Typography variant="caption">
                {stats.mediaAttached} arquivos anexados
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

OutputNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    stats: PropTypes.shape({
      lastRun: PropTypes.bool,
      messagesSent: PropTypes.number,
      mediaAttached: PropTypes.number,
    }),
  }).isRequired,
};
