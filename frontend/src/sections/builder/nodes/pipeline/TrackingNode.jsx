import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { BaseNode } from '../BaseNode';
import { getStatLineStyles } from '../../utils/node-styles';
import { Iconify } from 'src/components/iconify';

/**
 * Tracking Pipeline Node
 * Shows custom fields being tracked (read-only visualization)
 */
export function TrackingNode({ data }) {
  const stats = data?.stats || {};

  return (
    <BaseNode
      id={data.id}
      type="pipeline"
      icon="mdi:brain-outline"
      title="Rastreamento"
      tooltip="Informações rastreadas sobre o cliente"
      editable={false}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Informações sobre o cliente ao longo da conversa
      </Typography>

      {stats.lastRun && (
        <Box>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Última execução:
          </Typography>

          <Box sx={getStatLineStyles()}>
            <Iconify icon="mdi:database" width={16} sx={{ color: 'primary.main' }} />
            <Typography variant="caption">
              {stats.fieldsTracked || 0} campos rastreados
            </Typography>
          </Box>

          {stats.fieldsUpdated > 0 && (
            <Box sx={getStatLineStyles()}>
              <Iconify icon="mdi:update" width={16} sx={{ color: 'success.main' }} />
              <Typography variant="caption">
                {stats.fieldsUpdated} campos atualizados
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

TrackingNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    stats: PropTypes.shape({
      lastRun: PropTypes.bool,
      fieldsTracked: PropTypes.number,
      fieldsUpdated: PropTypes.number,
    }),
  }).isRequired,
};
