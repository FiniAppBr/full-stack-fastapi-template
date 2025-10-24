import { memo } from 'react';
import { Handle, Position } from 'reactflow';

import Box from '@mui/material/Box';

import { nodeStyles } from 'src/sections/agent/flowchart/node-styles';

import { StageNodeHeader } from './components/StageNodeHeader';
import { StageNodeSummary } from './components/StageNodeSummary';

// ----------------------------------------------------------------------

const StageNode = memo(({ data, selected }) => (
    <Box
      sx={{
        minWidth: nodeStyles.minWidth.stage,
        borderRadius: nodeStyles.borderRadius.stage,
        border: (theme) => `1px solid ${selected ? theme.palette.primary.main : theme.palette.grey[300]}`,
        bgcolor: 'grey.50',
        boxShadow: (theme) =>
          selected
            ? `0 0 0 2px ${theme.palette.primary.main}40, 0 4px 12px ${theme.palette.primary.main}20`
            : `0 1px 3px ${theme.palette.grey[300]}40`,
        transition: nodeStyles.transition,
        cursor: 'pointer',
        '&:hover': {
          boxShadow: (theme) =>
            selected
              ? `0 0 0 2px ${theme.palette.primary.main}40, 0 4px 12px ${theme.palette.primary.main}20`
              : `0 2px 8px ${theme.palette.grey[400]}40`,
          borderColor: (theme) => (selected ? theme.palette.primary.main : theme.palette.grey[400]),
        },
      }}
    >
      {/* Header - always visible */}
      <StageNodeHeader icon={data.icon} label={data.label} />

      {/* Summary - always visible */}
      <StageNodeSummary
        knowledge={data.knowledge}
        dataGoals={data.dataGoals}
        actions={data.actions}
      />

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: '#9ca3af',
          border: '2px solid #fff',
          width: nodeStyles.handle.width,
          height: nodeStyles.handle.height,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: '#9ca3af',
          border: '2px solid #fff',
          width: nodeStyles.handle.width,
          height: nodeStyles.handle.height,
        }}
      />
    </Box>
  ));

StageNode.displayName = 'StageNode';

export default StageNode;
