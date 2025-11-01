import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { BaseNode } from '../BaseNode';

/**
 * Style Configuration Node
 * Shows multi-turn conversation style config
 */
export function StyleNode({ data }) {
  const config = data?.config || {};
  const enabled = config.enabled || false;
  const onEdit = data?.onEdit || (() => {});

  return (
    <BaseNode
      id={data.id}
      type="style"
      icon="mdi:chat-processing"
      title="Estilo de Conversa"
      tooltip="Como o AI formata mensagens"
      badge={enabled ? 'Ativo' : 'Desativado'}
      editable
      onEdit={onEdit}
      targetHandle={false}
      sourceHandle={false}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Como o AI formata mensagens
      </Typography>

      {!enabled ? (
        <Typography variant="caption" color="text.disabled">
          Divisão de mensagens desativada
        </Typography>
      ) : (
        <Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Tom:{' '}
            </Typography>
            <Chip label={config.style || 'Natural'} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
          </Box>

          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Máximo: <strong>{config.max_splits || 3} mensagens</strong>
            </Typography>
          </Box>

          <Box sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem', fontStyle: 'italic' }}>
              Exemplo:
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
              &quot;Mensagem 1 aqui...&quot;
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
              &quot;Mensagem 2 continua...&quot;
            </Typography>
          </Box>
        </Box>
      )}
    </BaseNode>
  );
}

StyleNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    config: PropTypes.shape({
      enabled: PropTypes.bool,
      style: PropTypes.string,
      max_splits: PropTypes.number,
    }),
    onEdit: PropTypes.func,
  }).isRequired,
};
