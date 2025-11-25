import PropTypes from 'prop-types';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { BaseNode } from '../BaseNode';
import { PIPELINE_NODE_CONFIG } from '../../utils/node-styles';

/**
 * Tracking Pipeline Node
 * Shows custom fields being tracked (read-only visualization)
 */
export function TrackingNode({ data }) {
  const fields = data?.fields || [];

  return (
    <BaseNode
      id={data.id}
      type="pipeline"
      pipelineType="tracking"
      icon="mdi:form-textbox"
      title="Coleta de Dados"
      tooltip="Informações rastreadas sobre o cliente"
      editable={false}
      iconSize={PIPELINE_NODE_CONFIG.iconSize}
      iconColor={PIPELINE_NODE_CONFIG.iconColor}
      rightHandle
    >
      {fields.length > 0 ? (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
          {fields.map((field) => (
            <Chip
              key={field}
              label={field}
              size="small"
              sx={{
                bgcolor: 'primary.lighter',
                color: 'primary.dark',
                fontWeight: (theme) => theme.typography.fontWeightMedium,
              }}
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.disabled">
          Nenhum campo configurado
        </Typography>
      )}
    </BaseNode>
  );
}

TrackingNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    fields: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};
