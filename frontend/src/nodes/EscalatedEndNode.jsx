import { memo } from 'react';
import { Handle, Position } from 'reactflow';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

const EscalatedEndNode = memo(({ data, id, selected }) => {
  // Color based on end type
  const getColor = () => {
    switch (data.endType) {
      case 'success':
        return { main: '#10b981', border: '#059669' }; // Green
      case 'escalated':
        return { main: '#f59e0b', border: '#d97706' }; // Orange
      case 'failed':
      case 'abandoned':
        return { main: '#ef4444', border: '#dc2626' }; // Red
      default:
        return { main: '#6366f1', border: '#4f46e5' }; // Blue
    }
  };

  const colors = getColor();

  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        minWidth: 180,
        borderRadius: 2,
        border: `2px solid ${selected ? '#000' : colors.border}`,
        bgcolor: colors.main,
        color: 'white',
        boxShadow: selected ? 3 : 1,
        transition: 'all 0.2s ease-in-out',
        textAlign: 'center',
        '&:hover': {
          boxShadow: 2,
        },
      }}
    >
      {/* End Stage Icon and Label */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        🎯 END
      </Typography>

      <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
        {data.label}
      </Typography>

      {/* Only target handle (input) - End stages don't have outputs */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: '#fff',
          border: `2px solid ${colors.border}`,
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
});

EscalatedEndNode.displayName = 'EndStageNode';

export default EscalatedEndNode;
