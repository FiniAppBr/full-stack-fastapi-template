import 'reactflow/dist/style.css';

import { useCallback } from 'react';
import ReactFlow, {
  Panel,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useEdgesState,
  useNodesState,
} from 'reactflow';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { nodeTypes } from './flowchart/node-types';
import { initialNodes, initialEdges } from './flowchart/initial-data';

// ----------------------------------------------------------------------

export default function FlowchartBuilderView() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <Container maxWidth={false} disableGutters>
      <Box
        sx={{
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Bar */}
        <Box
          sx={{
            p: 2,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h4">Flowchart Builder</Typography>
            <Stack direction="row" spacing={2}>
              <Button variant="outlined">Save</Button>
              <Button variant="contained">Test Mode</Button>
            </Stack>
          </Stack>
        </Box>

        {/* React Flow Canvas */}
        <Box sx={{ flexGrow: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Panel position="top-left">
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  p: 2,
                  borderRadius: 1,
                  boxShadow: 2,
                  width: 200,
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Node Library
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Button variant="outlined" size="small" fullWidth>
                    + Stage
                  </Button>
                  <Button variant="outlined" size="small" fullWidth>
                    + End State
                  </Button>
                </Stack>
              </Box>
            </Panel>

            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'agent':
                    return '#1976d2';
                  case 'stage':
                    return '#6366f1';
                  case 'successEnd':
                    return '#10b981';
                  case 'escalatedEnd':
                    return '#f59e0b';
                  default:
                    return '#94a3b8';
                }
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </Box>
      </Box>
    </Container>
  );
}
