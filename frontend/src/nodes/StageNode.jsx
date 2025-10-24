import { memo, useRef, useState, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

const StageNode = memo(({ data, id, selected }) => {
  const [expanded, setExpanded] = useState(data.expanded || false);
  const updateNodeInternals = useUpdateNodeInternals();
  const contentRef = useRef(null);

  useEffect(() => {
    // Update node dimensions when expanding/collapsing
    updateNodeInternals(id);
  }, [expanded, id, updateNodeInternals]);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <Box
      sx={{
        minWidth: 280,
        borderRadius: 1.5,
        border: (theme) => `2px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
        bgcolor: 'background.paper',
        boxShadow: selected ? 3 : 1,
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          boxShadow: 2,
        },
      }}
    >
      {/* Node Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: expanded ? (theme) => `1px solid ${theme.palette.divider}` : 'none',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {data.icon && <span style={{ marginRight: 8 }}>{data.icon}</span>}
          {data.label}
        </Typography>

        <IconButton size="small" onClick={toggleExpand}>
          {expanded ? '−' : '+'}
        </IconButton>
      </Box>

      {/* Collapsed Summary */}
      {!expanded && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
            {data.knowledge && (
              <Typography variant="caption" color="text.secondary">
                📚 {data.knowledge.length}
              </Typography>
            )}
            {data.dataGoals && (
              <Typography variant="caption" color="text.secondary">
                📋 {data.dataGoals.length}
              </Typography>
            )}
            {data.actions && (
              <Typography variant="caption" color="text.secondary">
                ⚡ {data.actions.length}
              </Typography>
            )}
          </Stack>
        </Box>
      )}

      {/* Expanded Content */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box ref={contentRef} sx={{ px: 2, pb: 2 }}>
          {/* Knowledge Section */}
          {data.knowledge && data.knowledge.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                📚 KNOWLEDGE
              </Typography>
              {data.knowledge.map((item, index) => (
                <Typography key={index} variant="caption" color="text.secondary" sx={{ display: 'block', ml: 1 }}>
                  • {item.name}
                </Typography>
              ))}
            </Box>
          )}

          {/* Data Goals Section */}
          {data.dataGoals && data.dataGoals.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                📋 DATA GOALS
              </Typography>
              {data.dataGoals.map((goal, index) => (
                <Typography key={index} variant="caption" color="text.secondary" sx={{ display: 'block', ml: 1 }}>
                  • {goal.name} ({goal.necessity === 'critical' ? '🔴' : goal.necessity === 'important' ? '🟡' : '🟢'})
                </Typography>
              ))}
            </Box>
          )}

          {/* Actions Section */}
          {data.actions && data.actions.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                ⚡ ACTIONS
              </Typography>
              {data.actions.map((action, index) => (
                <Typography key={index} variant="caption" color="text.secondary" sx={{ display: 'block', ml: 1 }}>
                  • {action.name}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: '#555',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: '#555',
        }}
      />
    </Box>
  );
});

StageNode.displayName = 'ExpandableNode';

export default StageNode;
