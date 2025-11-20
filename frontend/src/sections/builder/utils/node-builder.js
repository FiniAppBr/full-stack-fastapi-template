/**
 * Node Builder - Transforms agent configuration into React Flow nodes and edges
 * Refactored with helper functions for better maintainability
 */

import { generateLayout } from './node-positions';

// ============================================================
// PIPELINE NODES CREATORS
// ============================================================

/**
 * Create all pipeline (spine) nodes
 * @param {object} positions - Node positions from generateLayout
 * @param {object} agentConfig - Agent configuration
 * @param {object} blocks - Agent blocks (knowledge, personality)
 * @returns {Array} Pipeline nodes
 */
function createPipelineNodes(positions, agentConfig, blocks) {
  const knowledgeBlocks = blocks?.knowledge || [];
  const personalityBlocks = blocks?.personality || [];
  const firstPersonalityBlock = personalityBlocks[0] || {};
  const responseSchema = agentConfig?.response_schema || {};
  const fields = Object.keys(responseSchema);
  const tools = agentConfig?.tools || [];
  const validationRules = agentConfig?.validation_rules || [];
  const memoryEnabled = agentConfig?.memory_enabled ?? true;

  return [
    // Communication Input
    {
      id: 'input',
      type: 'communicationNode',
      position: positions.input,
      data: {
        channel: 'whatsapp',
        direction: 'input',
      },
    },
    // Knowledge Search
    {
      id: 'knowledge',
      type: 'knowledgeNode',
      position: positions.knowledge,
      data: {
        id: 'knowledge',
        blockCount: knowledgeBlocks.length,
        memoryEnabled,
      },
    },
    // Tracking (Data Collection)
    {
      id: 'tracking',
      type: 'trackingNode',
      position: positions.tracking,
      data: {
        id: 'tracking',
        fields,
      },
    },
    // Personality
    {
      id: 'personality',
      type: 'personalityNode',
      position: positions.personality,
      data: {
        id: 'personality',
        tone: firstPersonalityBlock.tone,
        useEmojis: firstPersonalityBlock.use_emojis,
        multiTurnEnabled: agentConfig?.multi_turn_config?.enabled,
        blockCount: personalityBlocks.length,
      },
    },
    // Actions (Tools)
    {
      id: 'actions',
      type: 'actionsNode',
      position: positions.actions,
      data: {
        id: 'actions',
        actionsCount: Array.isArray(tools) ? tools.length : 0,
      },
    },
    // Validation
    {
      id: 'validation',
      type: 'validationNode',
      position: positions.validation,
      data: {
        id: 'validation',
        rulesCount: Array.isArray(validationRules) ? validationRules.length : 0,
      },
    },
    // Communication Output
    {
      id: 'output',
      type: 'communicationNode',
      position: positions.output,
      data: {
        channel: 'whatsapp',
        direction: 'output',
      },
    },
  ];
}

/**
 * Create pipeline (spine) edges - the main vertical flow
 * @returns {Array} Pipeline edges
 */
function createPipelineEdges() {
  return [
    { id: 'e-input-knowledge', source: 'input', target: 'knowledge', animated: true },
    { id: 'e-knowledge-tracking', source: 'knowledge', target: 'tracking', animated: true },
    { id: 'e-tracking-personality', source: 'tracking', target: 'personality', animated: true },
    { id: 'e-personality-actions', source: 'personality', target: 'actions', animated: true },
    { id: 'e-actions-validation', source: 'actions', target: 'validation', animated: true },
    { id: 'e-validation-output', source: 'validation', target: 'output', animated: true },
  ];
}

// ============================================================
// CONFIG NODES CREATORS (by pipeline section)
// ============================================================

/**
 * Create Knowledge pipeline config nodes (visualization + filter)
 * @returns {object} { nodes, edges }
 */
function createKnowledgeConfigNodes(positions, agentConfig, handlers, blocks) {
  const nodes = [];
  const edges = [];
  const knowledgeBlocks = blocks?.knowledge || [];

  // Knowledge Visualization (3D canvas) - always show
  nodes.push({
    id: 'knowledge_viz',
    type: 'knowledgeVizNode',
    position: positions.knowledge_viz,
    data: {
      id: 'knowledge_viz',
      config: {
        blockCount: knowledgeBlocks.length || 12,
        chunks: 450, // Stub
        tags: ['pricing', 'products', 'faq', 'policies', 'services'], // Stub
      },
    },
    draggable: true,
  });

  edges.push({
    id: 'e-knowledge-viz',
    source: 'knowledge',
    sourceHandle: 'right',
    target: 'knowledge_viz',
    targetHandle: 'left',
    style: { stroke: '#9e9e9e' },
  });

  // Filter Node (gating_rules) - conditional
  if (agentConfig?.gating_rules?.length > 0) {
    nodes.push({
      id: 'filter_config',
      type: 'filterNode',
      position: positions.filter_config,
      data: {
        id: 'filter_config',
        config: {
          rules: agentConfig.gating_rules,
        },
        onEdit: handlers.onEditFilter,
      },
      draggable: true,
    });

    edges.push({
      id: 'e-filter-knowledge',
      source: 'filter_config',
      target: 'knowledge',
      type: 'smoothstep',
      style: { stroke: '#2196f3', strokeDasharray: '5 5' },
      animated: false,
    });
  }

  return { nodes, edges };
}

/**
 * Create Tracking pipeline config nodes (fields + files)
 * @returns {object} { nodes, edges }
 */
function createTrackingConfigNodes(positions, agentConfig, handlers) {
  const nodes = [];
  const edges = [];

  // Fields Node (response_schema) - always show
  nodes.push({
    id: 'fields_config',
    type: 'fieldsNode',
    position: positions.fields_config,
    data: {
      id: 'fields_config',
      config: {
        fields: agentConfig?.response_schema || {
          budget_range: ['unknown', 'low', 'medium', 'high'],
          urgency: ['normal', 'urgent'],
          sentiment: ['neutral', 'positive', 'negative'],
        },
      },
      onEdit: handlers.onEditTracking || (() => {}),
    },
    draggable: true,
  });

  edges.push({
    id: 'e-fields-tracking',
    source: 'tracking',
    sourceHandle: 'right',
    target: 'fields_config',
    targetHandle: 'left',
    style: { stroke: '#9e9e9e' },
  });

  // Files Node (media_rules) - conditional
  if (agentConfig?.media_rules && Object.keys(agentConfig.media_rules).length > 0) {
    nodes.push({
      id: 'files_config',
      type: 'filesNode',
      position: positions.files_config,
      data: {
        id: 'files_config',
        config: {
          mediaRules: agentConfig.media_rules,
        },
        onEdit: handlers.onEditFiles,
      },
      draggable: true,
    });

    edges.push({
      id: 'e-files-tracking',
      source: 'files_config',
      target: 'tracking',
      type: 'smoothstep',
      style: { stroke: '#ed6c02', strokeDasharray: '5 5' },
      animated: false,
    });
  }

  return { nodes, edges };
}

/**
 * Create Personality pipeline config nodes (tone + style)
 * @returns {object} { nodes, edges }
 */
function createPersonalityConfigNodes(positions, agentConfig, handlers, blocks) {
  const nodes = [];
  const edges = [];
  const personalityBlocks = blocks?.personality || [];
  const firstPersonalityBlock = personalityBlocks[0] || {};

  // Tone Node - always show
  nodes.push({
    id: 'tone_config',
    type: 'toneNode',
    position: positions.tone_config,
    data: {
      id: 'tone_config',
      config: {
        tone: firstPersonalityBlock.tone || 'professional',
        useEmojis: firstPersonalityBlock.use_emojis || false,
      },
      onEdit: () => {},
    },
    draggable: true,
  });

  edges.push({
    id: 'e-tone-personality',
    source: 'personality',
    sourceHandle: 'right',
    target: 'tone_config',
    targetHandle: 'left',
    style: { stroke: '#9e9e9e' },
  });

  // Style Node - always show
  nodes.push({
    id: 'style_config',
    type: 'styleNode',
    position: positions.style_config,
    data: {
      id: 'style_config',
      config: agentConfig?.multi_turn_config || {},
      onEdit: handlers.onEditStyle,
    },
    draggable: true,
  });

  edges.push({
    id: 'e-personality-style',
    source: 'personality',
    sourceHandle: 'right',
    target: 'style_config',
    targetHandle: 'left',
    style: { stroke: '#9e9e9e' },
  });

  return { nodes, edges };
}

/**
 * Create Actions pipeline config nodes (tools)
 * @returns {object} { nodes, edges }
 */
function createActionsConfigNodes(positions, agentConfig, handlers) {
  const nodes = [];
  const edges = [];

  // Tools Node - always show
  nodes.push({
    id: 'tools_config',
    type: 'toolsNode',
    position: positions.tools_config,
    data: {
      id: 'tools_config',
      config: {
        tools: agentConfig?.tools || [
          { type: 'calendar', name: 'Calendário' },
          { type: 'payment', name: 'Pagamentos' },
        ],
      },
      onEdit: () => {},
    },
    draggable: true,
  });

  edges.push({
    id: 'e-tools-actions',
    source: 'actions',
    sourceHandle: 'right',
    target: 'tools_config',
    targetHandle: 'left',
    style: { stroke: '#9e9e9e' },
  });

  return { nodes, edges };
}

/**
 * Create Validation pipeline config nodes (corrections + handoffs)
 * @returns {object} { nodes, edges }
 */
function createValidationConfigNodes(positions, agentConfig, handlers) {
  const nodes = [];
  const edges = [];

  // Handoffs Node - always show
  nodes.push({
    id: 'handoffs_config',
    type: 'handoffsNode',
    position: positions.handoffs_config,
    data: {
      id: 'handoffs_config',
      config: {
        triggers: [
          { type: 'angry', condition: 'Cliente frustrado', action: 'Escalar imediatamente', urgent: true },
          { type: 'complex', condition: 'Questão complexa', action: 'Conectar com especialista' },
        ],
      },
      onEdit: () => {},
    },
    draggable: true,
  });

  edges.push({
    id: 'e-handoffs-validation',
    source: 'validation',
    sourceHandle: 'right',
    target: 'handoffs_config',
    targetHandle: 'left',
    style: { stroke: '#9e9e9e' },
  });

  // Corrections Node (validation_rules) - conditional
  if (agentConfig?.validation_rules?.length > 0) {
    nodes.push({
      id: 'corrections_config',
      type: 'correctionsNode',
      position: positions.corrections_config,
      data: {
        id: 'corrections_config',
        config: {
          rules: agentConfig.validation_rules,
        },
        onEdit: handlers.onEditCorrections,
      },
      draggable: true,
    });

    edges.push({
      id: 'e-corrections-validation',
      source: 'corrections_config',
      target: 'validation',
      type: 'smoothstep',
      style: { stroke: '#2e7d32', strokeDasharray: '5 5' },
      animated: false,
    });
  }

  return { nodes, edges };
}

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================

/**
 * Build React Flow nodes and edges from agent configuration
 * @param {object} agentConfig - Agent configuration from backend API
 * @param {object} handlers - Event handlers { onEditFilter, onEditTracking, ... }
 * @param {object} blocks - Agent blocks { knowledge: [], personality: [] } (optional)
 * @returns {object} { nodes, edges }
 */
export function buildFlowFromConfig(agentConfig, handlers = {}, blocks = {}) {
  const positions = generateLayout(agentConfig);

  // Create pipeline (spine) nodes and edges
  const pipelineNodes = createPipelineNodes(positions, agentConfig, blocks);
  const pipelineEdges = createPipelineEdges();

  // Create config nodes by pipeline section
  const knowledge = createKnowledgeConfigNodes(positions, agentConfig, handlers, blocks);
  const tracking = createTrackingConfigNodes(positions, agentConfig, handlers);
  const personality = createPersonalityConfigNodes(positions, agentConfig, handlers, blocks);
  const actions = createActionsConfigNodes(positions, agentConfig, handlers);
  const validation = createValidationConfigNodes(positions, agentConfig, handlers);

  // Combine everything
  const nodes = [
    ...pipelineNodes,
    ...knowledge.nodes,
    ...tracking.nodes,
    ...personality.nodes,
    ...actions.nodes,
    ...validation.nodes,
  ];

  const edges = [
    ...pipelineEdges,
    ...knowledge.edges,
    ...tracking.edges,
    ...personality.edges,
    ...actions.edges,
    ...validation.edges,
  ];

  return { nodes, edges };
}

/**
 * Calculate total configuration count for complexity indicator
 */
export function getConfigCount(agentConfig) {
  let count = 0;

  if (agentConfig?.gating_rules?.length > 0) {
    count += 1;
  }
  if (agentConfig?.response_schema && Object.keys(agentConfig.response_schema).length > 0) {
    count += Object.keys(agentConfig.response_schema).length;
  }
  if (agentConfig?.validation_rules?.length > 0) {
    count += 1;
  }
  if (agentConfig?.media_rules && Object.keys(agentConfig.media_rules).length > 0) {
    count += 1;
  }
  if (agentConfig?.multi_turn_config?.enabled) {
    count += 1;
  }

  return count;
}

/**
 * Transform agent config back to API format (for saving)
 * @param {object} nodes - React Flow nodes
 * @param {object} agentConfig - Current agent config
 * @returns {object} Updated agent config
 */
export function transformNodesToConfig(nodes, agentConfig) {
  // This would be implemented when we add editing functionality
  // For now, we just pass through the existing config
  return agentConfig;
}
