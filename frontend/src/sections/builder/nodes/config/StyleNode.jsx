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
          {/* Multi-turn bubbles visualization */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
            {[...Array(config.max_splits || 3)].map((_, index) => (
              <Box
                key={index}
                sx={{
                  height: 24,
                  bgcolor: 'primary.main',
                  opacity: 0.8 - (index * 0.2),
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  width: `${100 - (index * 15)}%`,
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: 2,
                    bgcolor: 'white',
                    opacity: 0.5,
                    borderRadius: 1,
                  }}
                />
              </Box>
            ))}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', fontSize: '0.7rem' }}>
            {config.max_splits || 3} mensagens · {config.style || 'Natural'}
          </Typography>
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
