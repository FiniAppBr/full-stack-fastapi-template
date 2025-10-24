import { memo } from 'react';
import { Handle, Position } from 'reactflow';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { nodeStyles } from 'src/sections/agent/flowchart/node-styles';

// ----------------------------------------------------------------------

const SuccessEndNode = memo(({ data, id, selected }) => {
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
        px: nodeStyles.padding.endState.px,
        py: nodeStyles.padding.endState.py,
        minWidth: nodeStyles.minWidth.endState,
        borderRadius: nodeStyles.borderRadius.endState,
        border: `${nodeStyles.borderWidth.default}px solid ${selected ? '#000' : colors.border}`,
        bgcolor: colors.main,
        color: 'white',
        boxShadow: selected ? nodeStyles.shadow.selected : nodeStyles.shadow.default,
        transition: nodeStyles.transition,
        textAlign: 'center',
        '&:hover': {
          boxShadow: nodeStyles.shadow.hover,
        },
      }}
    >
      {/* End Stage Icon and Label */}
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mb: 0.5 }}>
        <Iconify icon="solar:check-circle-bold" width={nodeStyles.iconSize.endState} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          END
        </Typography>
      </Stack>

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
          border: `${nodeStyles.handle.borderWidth}px solid ${colors.border}`,
          width: nodeStyles.handle.width,
          height: nodeStyles.handle.height,
        }}
      />
    </Box>
  );
});

SuccessEndNode.displayName = 'EndStageNode';

export default SuccessEndNode;
