import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { BaseNode } from '../BaseNode';

/**
 * Filter Configuration Node
 * Controls knowledge visibility based on custom fields (gating_rules)
 */
export function FilterNode({ data }) {
  const config = data?.config || {};
  const rules = config.rules || [];
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {rules.slice(0, 3).map((rule, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                py: 0.5,
                px: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
                opacity: 0.8 - (index * 0.2),
              }}
            >
              <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                {rule.if_field} = {rule.equals}
              </Typography>
            </Box>
          ))}
          {rules.length > 3 && (
            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontSize: '0.7rem' }}>
              +{rules.length - 3} mais
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
    config: PropTypes.shape({
      rules: PropTypes.arrayOf(
        PropTypes.shape({
          if_field: PropTypes.string,
          equals: PropTypes.string,
          exclude_tags: PropTypes.arrayOf(PropTypes.string),
        })
      ),
    }),
    onEdit: PropTypes.func,
  }).isRequired,
};
