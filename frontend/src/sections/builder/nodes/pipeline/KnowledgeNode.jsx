import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { BaseNode } from '../BaseNode';
import { getStatLineStyles } from '../../utils/node-styles';

/**
 * Knowledge Search Pipeline Node
 * Shows RAG retrieval stats (read-only visualization)
 */
export function KnowledgeNode({ data }) {
  const stats = data?.stats || {};

  return (
    <BaseNode
      id={data.id}
      type="pipeline"
      icon="mdi:brain"
      title="Conhecimento"
      tooltip="Base de conhecimento + memórias anteriores"
      editable={false}
      iconSize={40}
      iconColor="text.secondary"
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Base de conhecimento do seu negócio + memórias de conversas anteriores com este cliente
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
            <Iconify icon="mdi:check-circle" width={16} sx={{ color: 'success.main' }} />
            <Typography variant="caption">
              {stats.chunksFound || 0} documentos encontrados
            </Typography>
          </Box>

          <Box sx={getStatLineStyles()}>
            <Iconify icon="mdi:brain" width={16} sx={{ color: 'info.main' }} />
            <Typography variant="caption">
              {stats.memoriesFound || 0} memórias recuperadas
            </Typography>
          </Box>

          {stats.filtersApplied > 0 && (
            <Box sx={getStatLineStyles()}>
              <Iconify icon="mdi:filter" width={16} sx={{ color: 'warning.main' }} />
              <Typography variant="caption">
                {stats.filtersApplied} filtros aplicados
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

KnowledgeNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    stats: PropTypes.shape({
      lastRun: PropTypes.bool,
      chunksFound: PropTypes.number,
      memoriesFound: PropTypes.number,
      filtersApplied: PropTypes.number,
    }),
  }).isRequired,
};
