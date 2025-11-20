import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { BaseNode } from '../BaseNode';

/**
 * Fields Configuration Node
 * Shows tracked state fields with their current values
 */
export function FieldsNode({ data }) {
  const config = data?.config || {};
  const fields = config.fields || {};
  const onEdit = data?.onEdit || (() => {});

  const fieldEntries = Object.entries(fields);

  return (
    <BaseNode
      id={data.id}
      type="fields"
      pipelineType="tracking"
      title="Campos Rastreados"
      tooltip="Estados que o AI extrai da conversa"
      badge={fieldEntries.length}
      editable
      onEdit={onEdit}
      targetHandle={false}
      sourceHandle={false}
      leftHandle={true}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Estados extraídos da conversa
      </Typography>

      {fieldEntries.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          Nenhum campo configurado
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {fieldEntries.slice(0, 4).map(([key, values]) => (
            <Box
              key={key}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 0.75,
                bgcolor: 'action.hover',
                borderRadius: 0.5,
                borderLeft: 3,
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                {key}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                {Array.isArray(values) ? values[0] : 'unknown'}
              </Typography>
            </Box>
          ))}
          {fieldEntries.length > 4 && (
            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontSize: '0.7rem' }}>
              +{fieldEntries.length - 4} mais
            </Typography>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

FieldsNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    config: PropTypes.shape({
      fields: PropTypes.objectOf(PropTypes.array),
    }),
    onEdit: PropTypes.func,
  }).isRequired,
};
