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
        <Box>
          {rules.slice(0, 2).map((rule, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'start', gap: 0.5 }}>
                <span style={{ fontSize: '1rem' }}>⚠️</span>
                <span>
                  Se {rule.if_field} = <strong>{rule.equals}</strong>
                  <br />→ {rule.action === 'strip_prices' ? 'Remover preços' : rule.action}
                  <br />
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                    💬 {rule.message || 'Proteção ativa'}
                  </span>
                </span>
              </Typography>
            </Box>
          ))}
          {rules.length > 2 && (
            <Typography variant="caption" color="text.disabled">
              +{rules.length - 2} verificações...
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
