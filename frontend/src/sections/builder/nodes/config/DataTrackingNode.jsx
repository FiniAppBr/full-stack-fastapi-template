import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { BaseNode } from '../BaseNode';

/**
 * Data Tracking Configuration Node
 * Shows custom fields being tracked (response_schema)
 */
export function DataTrackingNode({ data }) {
  const schema = data?.schema || {};
  const fieldNames = Object.keys(schema);
  const onEdit = data?.onEdit || (() => {});

  return (
    <BaseNode
      id={data.id}
      type="tracking"
      icon="mdi:clipboard-list"
      title="Rastreamento de Dados"
      tooltip="Informações que o AI acompanha sobre o cliente"
      badge={fieldNames.length}
      editable
      onEdit={onEdit}
      targetHandle={false}
      sourceHandle={false}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Informações que o AI acompanha sobre o cliente
      </Typography>

      {fieldNames.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          Nenhum campo configurado
        </Typography>
      ) : (
        <Box>
          {fieldNames.slice(0, 3).map((fieldName) => (
            <Box key={fieldName} sx={{ mb: 1 }}>
              <Typography variant="caption" fontWeight={600}>
                • {fieldName}
              </Typography>
              <br />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {schema[fieldName]?.join(' → ') || 'valores configurados'}
              </Typography>
            </Box>
          ))}
          {fieldNames.length > 3 && (
            <Typography variant="caption" color="text.disabled">
              +{fieldNames.length - 3} campos...
            </Typography>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

DataTrackingNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    schema: PropTypes.object,
    onEdit: PropTypes.func,
  }).isRequired,
};
