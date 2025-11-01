import { useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

import {
  CommunicationNode,
  KnowledgeNode,
  TrackingNode,
  ValidationNode,
  PersonalityNode,
  FilterNode,
  DataTrackingNode,
  CorrectionsNode,
  FilesNode,
  StyleNode,
} from './nodes';

import { buildFlowFromConfig, getConfigCount } from './utils/node-builder';
import { getComplexityLevel } from './utils/node-styles';

// ----------------------------------------------------------------------

// Register custom node types
const nodeTypes = {
  communicationNode: CommunicationNode,
  knowledgeNode: KnowledgeNode,
  trackingNode: TrackingNode,
  validationNode: ValidationNode,
  personalityNode: PersonalityNode,
  filterNode: FilterNode,
  dataTrackingNode: DataTrackingNode,
  correctionsNode: CorrectionsNode,
  filesNode: FilesNode,
  styleNode: StyleNode,
};

// ----------------------------------------------------------------------

export function BuilderFlowView({ agentConfig, onUpdateConfig }) {
  // State for edit drawers
  const [editDrawer, setEditDrawer] = useState({ open: false, type: null, data: null });

  // Build nodes and edges from agent config
  const { initialNodes, initialEdges } = useMemo(() => {
    const handlers = {
      onEditFilter: () => setEditDrawer({ open: true, type: 'filter', data: agentConfig?.gating_rules || [] }),
      onEditTracking: () => setEditDrawer({ open: true, type: 'tracking', data: agentConfig?.response_schema || {} }),
      onEditCorrections: () => setEditDrawer({ open: true, type: 'corrections', data: agentConfig?.validation_rules || [] }),
      onEditFiles: () => setEditDrawer({ open: true, type: 'files', data: agentConfig?.media_rules || {} }),
      onEditStyle: () => setEditDrawer({ open: true, type: 'style', data: agentConfig?.multi_turn_config || {} }),
    };

    const { nodes, edges } = buildFlowFromConfig(agentConfig, handlers);
    return { initialNodes: nodes, initialEdges: edges };
  }, [agentConfig]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle edge connections (for future multi-agent workflows)
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Calculate complexity
  const configCount = getConfigCount(agentConfig);
  const complexity = getComplexityLevel(configCount);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: 'background.neutral',
        position: 'relative',
      }}
    >
      {/* Complexity Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
        }}
      >
        <Chip
          label={`${complexity.label} (${configCount} configs)`}
          sx={{
            bgcolor: complexity.color,
            color: 'white',
            fontWeight: 600,
          }}
        />
      </Box>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Controls
          position="bottom-right"
          showInteractive={false}
          style={{
            button: {
              backgroundColor: 'white',
              border: '1px solid #ddd',
            },
          }}
        />
        <MiniMap
          position="bottom-left"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #ddd',
          }}
          nodeColor={(node) => {
            if (node.type === 'input' || node.type === 'output') return '#9e9e9e';
            if (node.type?.includes('Node')) return '#1976d2';
            if (node.type?.includes('config')) return '#2196f3';
            return '#e0e0e0';
          }}
        />
        <Background variant="dots" gap={16} size={1} color="#e0e0e0" />
      </ReactFlow>

      {/* Edit Drawers (to be implemented) */}
      {/* {editDrawer.open && (
        <EditDrawer
          type={editDrawer.type}
          data={editDrawer.data}
          onClose={() => setEditDrawer({ open: false, type: null, data: null })}
          onSave={(updatedData) => {
            // Update agent config
            onUpdateConfig?.(editDrawer.type, updatedData);
            setEditDrawer({ open: false, type: null, data: null });
          }}
        />
      )} */}
    </Box>
  );
}

BuilderFlowView.propTypes = {
  agentConfig: PropTypes.shape({
    gating_rules: PropTypes.array,
    response_schema: PropTypes.object,
    validation_rules: PropTypes.array,
    media_rules: PropTypes.object,
    multi_turn_config: PropTypes.object,
  }),
  onUpdateConfig: PropTypes.func,
};

BuilderFlowView.defaultProps = {
  agentConfig: {},
  onUpdateConfig: () => {},
};
