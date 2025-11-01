import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { BaseNode } from '../BaseNode';

/**
 * Filter Configuration Node
 * Controls knowledge visibility based on custom fields (gating_rules)
 */
export function FilterNode({ data }) {
  const rules = data?.rules || [];
  const onEdit = data?.onEdit || (() => {});

  return (
    <BaseNode
      id={data.id}
      type="filter"
      icon="mdi:eye-off"
      title="Filtro de Conhecimento"
      tooltip="Controla o que o AI vê baseado no cliente"
      badge={rules.length}
      editable
      onEdit={onEdit}
      targetHandle={false}
      sourceHandle={false}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Controla o que o AI vê baseado no cliente
      </Typography>

      {rules.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          Nenhum filtro configurado
        </Typography>
      ) : (
        <Box>
          {rules.slice(0, 2).map((rule, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'start', gap: 0.5 }}>
                <span style={{ fontSize: '1rem' }}>🔒</span>
                <span>
                  {rule.if_field} = <strong>{rule.equals}</strong>
                  <br />→ Esconder {rule.exclude_tags?.join(', ') || 'tags'}
                </span>
              </Typography>
            </Box>
          ))}
          {rules.length > 2 && (
            <Typography variant="caption" color="text.disabled">
              +{rules.length - 2} regras...
            </Typography>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

FilterNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    rules: PropTypes.arrayOf(
      PropTypes.shape({
        if_field: PropTypes.string,
        equals: PropTypes.string,
        exclude_tags: PropTypes.arrayOf(PropTypes.string),
      })
    ),
    onEdit: PropTypes.func,
  }).isRequired,
};
