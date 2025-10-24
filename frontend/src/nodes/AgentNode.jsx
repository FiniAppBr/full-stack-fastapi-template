import { memo } from 'react';
import { Handle, Position } from 'reactflow';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

const AgentNode = memo(({ data, id, selected }) => (
    <Box
      sx={{
        minWidth: 300,
        borderRadius: 2,
        border: (theme) => `3px solid ${selected ? theme.palette.primary.dark : theme.palette.primary.main}`,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        boxShadow: selected ? 4 : 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      {/* Agent Header */}
      <Box sx={{ px: 3, py: 2, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          🤖 {data.label || 'AI AGENT'}
        </Typography>
      </Box>

      {/* Agent Details */}
      <Stack spacing={1} sx={{ px: 3, py: 2 }}>
        {data.model && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Model:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {data.model}
            </Typography>
          </Box>
        )}

        {data.personality && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Personality:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {data.personality}
            </Typography>
          </Box>
        )}

        {data.knowledgeCount !== undefined && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Knowledge:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {data.knowledgeCount} sources
            </Typography>
          </Box>
        )}

        {data.responseStyle && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Response:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {data.responseStyle}
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Only source handle (output) - Agent doesn't receive inputs */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: '#fff',
          border: '2px solid #1976d2',
          width: 12,
          height: 12,
        }}
      />
    </Box>
));

AgentNode.displayName = 'AgentNode';

export default AgentNode;
