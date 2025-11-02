import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import { BaseNode } from '../BaseNode';

/**
 * Knowledge Search Pipeline Node
 * Shows RAG retrieval stats + memory status (read-only visualization)
 */
export function KnowledgeNode({ data }) {
  const blockCount = data?.blockCount || 0;
  const memoryEnabled = data?.memoryEnabled ?? true;

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
      rightHandle
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {blockCount} {blockCount === 1 ? 'bloco' : 'blocos'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, ml: -1 }}>
          <Switch
            checked={memoryEnabled}
            disabled
            size="small"
            sx={{
              '& .MuiSwitch-switchBase.Mui-disabled': {
                opacity: 1,
              },
              '& .MuiSwitch-track': {
                opacity: 0.5,
              },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Memória {memoryEnabled ? 'ativada' : 'desativada'}
          </Typography>
        </Box>
      </Box>
    </BaseNode>
  );
}

KnowledgeNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    blockCount: PropTypes.number,
    memoryEnabled: PropTypes.bool,
  }).isRequired,
};
