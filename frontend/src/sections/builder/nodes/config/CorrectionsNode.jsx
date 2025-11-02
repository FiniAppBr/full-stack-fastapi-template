import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { BaseNode } from '../BaseNode';

/**
 * Corrections Configuration Node
 * Shows validation rules (response validation)
 */
export function CorrectionsNode({ data }) {
  const rules = data?.rules || [];
  const onEdit = data?.onEdit || (() => {});

  return (
    <BaseNode
      id={data.id}
      type="corrections"
      icon="mdi:check-circle"
      title="Correções Automáticas"
      tooltip="Verifica e corrige respostas antes de enviar"
      badge={rules.length}
      editable
      onEdit={onEdit}
      targetHandle={false}
      sourceHandle={false}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Verifica e corrige respostas antes de enviar
      </Typography>

      {rules.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          Nenhuma verificação configurada
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rules.slice(0, 2).map((rule, index) => (
            <Box
              key={index}
              sx={{
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.neutral',
              }}
            >
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                {rule.if_field} = {rule.equals}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Box sx={{ flex: 1, height: 1, bgcolor: 'error.main', opacity: 0.3 }} />
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'error.main' }}>
                  {rule.action === 'strip_prices' ? 'Strip' : rule.action}
                </Typography>
                <Box sx={{ flex: 1, height: 1, bgcolor: 'success.main', opacity: 0.3 }} />
              </Box>
            </Box>
          ))}
          {rules.length > 2 && (
            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontSize: '0.7rem' }}>
              +{rules.length - 2} mais
            </Typography>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

CorrectionsNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    rules: PropTypes.arrayOf(
      PropTypes.shape({
        if_field: PropTypes.string,
        equals: PropTypes.string,
        action: PropTypes.string,
        message: PropTypes.string,
      })
    ),
    onEdit: PropTypes.func,
  }).isRequired,
};
