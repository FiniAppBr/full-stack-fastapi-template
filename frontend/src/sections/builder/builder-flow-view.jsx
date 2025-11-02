import '@xyflow/react/dist/style.css';

import PropTypes from 'prop-types';
import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  MiniMap,
  addEdge,
  Controls,
  ReactFlow,
  Background,
  ControlButton,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';

import Box from '@mui/material/Box';

import { Iconify } from 'src/components/iconify';

import { getComplexityLevel } from './utils/node-styles';
import { getConfigCount, buildFlowFromConfig } from './utils/node-builder';
import {
  AddNode,
  FieldsNode,
  ToneNode,
  ToolsNode,
  StyleNode,
  FilterNode,
  ActionsNode,
  TrackingNode,
  HandoffsNode,
  KnowledgeNode,
  ValidationNode,
  PersonalityNode,
  CorrectionsNode,
  CommunicationNode,
  KnowledgeVisualizationNode,
} from './nodes';

// ----------------------------------------------------------------------

// Register custom node types
const nodeTypes = {
  communicationNode: CommunicationNode,
  knowledgeNode: KnowledgeNode,
  trackingNode: TrackingNode,
  validationNode: ValidationNode,
  personalityNode: PersonalityNode,
  actionsNode: ActionsNode,
  filterNode: FilterNode,
  fieldsNode: FieldsNode,
  toneNode: ToneNode,
  toolsNode: ToolsNode,
  correctionsNode: CorrectionsNode,
  handoffsNode: HandoffsNode,
  styleNode: StyleNode,
  knowledgeVizNode: KnowledgeVisualizationNode,
  addNode: AddNode,
};

// ----------------------------------------------------------------------

export function BuilderFlowView({ agentConfig, onUpdateConfig }) {
  // State for edit drawers
  const [editDrawer, setEditDrawer] = useState({ open: false, type: null, data: null });

  // State for minimap visibility
  const [showMiniMap, setShowMiniMap] = useState(false);

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

  // Update nodes and edges when they change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Prevent user from creating new connections
  const onConnect = useCallback(() => {
    // Do nothing - connections are read-only
  }, []);

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
      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        connectOnClick={false}
        edgesFocusable={false}
        edgesUpdatable={false}
      >
        <Controls position="top-right" showInteractive={false}>
          <ControlButton
            onClick={() => setShowMiniMap(!showMiniMap)}
            title={showMiniMap ? 'Hide minimap' : 'Show minimap'}
            style={{
              backgroundColor: showMiniMap ? '#1976d2' : undefined,
              color: showMiniMap ? 'white' : undefined,
            }}
          >
            <Iconify icon="mdi:map-outline" width={16} />
          </ControlButton>
        </Controls>
        {showMiniMap && (
          <MiniMap
            position="bottom-left"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #ddd',
            }}
            nodeColor={(node) => {
              if (node.type === 'communicationNode') return '#25D366';
              if (node.type?.includes('Node')) return '#1976d2';
              if (node.type?.includes('config')) return '#2196f3';
              return '#e0e0e0';
            }}
          />
        )}
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
    gating_rules: PropTypes.arrayOf(PropTypes.shape({})),
    response_schema: PropTypes.shape({}),
    validation_rules: PropTypes.arrayOf(PropTypes.shape({})),
    media_rules: PropTypes.shape({}),
    multi_turn_config: PropTypes.shape({}),
  }),
  onUpdateConfig: PropTypes.func,
};

BuilderFlowView.defaultProps = {
  agentConfig: {},
  onUpdateConfig: () => {},
};
