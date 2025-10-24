import { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// ----------------------------------------------------------------------

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: '🤖 Agent Node' },
    position: { x: 250, y: 50 },
    style: {
      background: '#3b82f6',
      color: 'white',
      border: '2px solid #2563eb',
      borderRadius: '8px',
      padding: '20px',
      fontSize: '16px',
      fontWeight: 600,
    },
  },
  {
    id: '2',
    data: { label: '🏁 START: Greeting' },
    position: { x: 250, y: 180 },
    style: {
      background: '#10b981',
      color: 'white',
      border: '2px solid #059669',
      borderRadius: '8px',
      padding: '16px',
    },
  },
  {
    id: '3',
    data: { label: 'Order Support' },
    position: { x: 100, y: 320 },
    style: {
      background: '#6366f1',
      color: 'white',
      border: '2px solid #4f46e5',
      borderRadius: '8px',
      padding: '16px',
    },
  },
  {
    id: '4',
    data: { label: 'Product Questions' },
    position: { x: 400, y: 320 },
    style: {
      background: '#6366f1',
      color: 'white',
      border: '2px solid #4f46e5',
      borderRadius: '8px',
      padding: '16px',
    },
  },
  {
    id: '5',
    type: 'output',
    data: { label: '🎯 END: Resolved' },
    position: { x: 250, y: 460 },
    style: {
      background: '#ef4444',
      color: 'white',
      border: '2px solid #dc2626',
      borderRadius: '8px',
      padding: '16px',
    },
  },
];

const initialEdges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: false,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    label: 'Order issue',
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  },
  {
    id: 'e2-4',
    source: '2',
    target: '4',
    label: 'Product question',
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  },
  {
    id: 'e3-5',
    source: '3',
    target: '5',
    label: 'Resolved',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
  },
  {
    id: 'e4-5',
    source: '4',
    target: '5',
    label: 'Answered',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
  },
];

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
                  Library
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Button variant="outlined" size="small" fullWidth>
                    + Stage
                  </Button>
                  <Button variant="outlined" size="small" fullWidth>
                    + Knowledge
                  </Button>
                  <Button variant="outlined" size="small" fullWidth>
                    + Action
                  </Button>
                </Stack>
              </Box>
            </Panel>

            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'input':
                    return '#3b82f6';
                  case 'output':
                    return '#ef4444';
                  default:
                    return '#6366f1';
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
