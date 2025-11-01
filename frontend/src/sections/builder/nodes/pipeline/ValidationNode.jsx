import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { BaseNode } from '../BaseNode';
import { getStatLineStyles } from '../../utils/node-styles';

/**
 * Validation Pipeline Node
 * Shows response validation stats (read-only visualization)
 */
export function ValidationNode({ data }) {
  const stats = data?.stats || {};

  return (
    <BaseNode
      id={data.id}
      type="pipeline"
      icon="mdi:shield-check"
      title="Validação"
      tooltip="Correções automáticas antes de enviar"
      editable={false}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Correções automáticas antes de enviar resposta
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
            <Iconify
              icon={stats.violationsDetected > 0 ? 'mdi:alert' : 'mdi:check-circle'}
              width={16}
              sx={{ color: stats.violationsDetected > 0 ? 'warning.main' : 'success.main' }}
            />
            <Typography variant="caption">
              {stats.violationsDetected || 0} violações detectadas
            </Typography>
          </Box>

          {stats.violationsDetected > 0 && (
            <Box sx={getStatLineStyles()}>
              <Iconify icon="mdi:auto-fix" width={16} sx={{ color: 'success.main' }} />
              <Typography variant="caption">
                Corrigido automaticamente
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

ValidationNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    stats: PropTypes.shape({
      lastRun: PropTypes.bool,
      violationsDetected: PropTypes.number,
    }),
  }).isRequired,
};
