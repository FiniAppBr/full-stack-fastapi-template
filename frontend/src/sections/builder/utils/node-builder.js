/**
 * Node Builder - Transforms agent configuration into React Flow nodes and edges
 * This is the core transformation layer between backend data and UI representation
 */

import { generateLayout } from './node-positions';

/**
 * Build React Flow nodes and edges from agent configuration
 * @param {object} agentConfig - Agent configuration from backend API
 * @param {object} handlers - Event handlers { onEditFilter, onEditTracking, ... }
 * @param {object} blocks - Agent blocks { knowledge: [], personality: [] } (optional)
 * @returns {object} { nodes, edges }
 */
export function buildFlowFromConfig(agentConfig, handlers = {}, blocks = {}) {
  const nodes = [];
  const edges = [];
  const positions = generateLayout(agentConfig);

  // ============================================================
  // PIPELINE NODES (Vertical Spine - Read-only)
  // ============================================================

  // Communication Input node
  nodes.push({
    id: 'input',
    type: 'communicationNode',
    position: positions.input,
    data: {
      channel: 'whatsapp',
      direction: 'input',
    },
  });

  // Knowledge Search node
  const knowledgeBlocks = blocks?.knowledge || [];
  const memoryEnabled = agentConfig?.memory_enabled ?? true; // Default to enabled
  nodes.push({
    id: 'knowledge',
    type: 'knowledgeNode',
    position: positions.knowledge,
    data: {
      id: 'knowledge',
      blockCount: knowledgeBlocks.length,
      memoryEnabled,
    },
  });

  // Tracking node - Extract field names from response_schema
  const responseSchema = agentConfig?.response_schema || {};
  const fields = Object.keys(responseSchema);
  nodes.push({
    id: 'tracking',
    type: 'trackingNode',
    position: positions.tracking,
    data: {
      id: 'tracking',
      fields,
    },
  });

  // Personality node
  const personalityBlocks = blocks?.personality || [];
  const firstPersonalityBlock = personalityBlocks[0] || {};
  nodes.push({
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
  });

  // Actions node
  const tools = agentConfig?.tools || [];
  const actionsCount = Array.isArray(tools) ? tools.length : 0;
  nodes.push({
    id: 'actions',
    type: 'actionsNode',
    position: positions.actions,
    data: {
      id: 'actions',
      actionsCount,
    },
  });

  // Validation node
  const validationRules = agentConfig?.validation_rules || [];
  nodes.push({
    id: 'validation',
    type: 'validationNode',
    position: positions.validation,
    data: {
      id: 'validation',
      rulesCount: Array.isArray(validationRules) ? validationRules.length : 0,
    },
  });

  // Communication Output node
  nodes.push({
    id: 'output',
    type: 'communicationNode',
    position: positions.output,
    data: {
      channel: 'whatsapp',
      direction: 'output',
    },
  });

  // ============================================================
  // ADD NODES (Action buttons to the right)
  // ============================================================

  // ADD NODES REMOVED - Temporarily disabled
  // const addNodeHandler = (nodeType) => {
  //   console.log('Add clicked for:', nodeType);
  //   // TODO: Implement add handler
  // };

  // ============================================================
  // PIPELINE EDGES (Vertical Flow)
  // ============================================================

  edges.push(
    { id: 'e-input-knowledge', source: 'input', target: 'knowledge', animated: true },
    { id: 'e-knowledge-tracking', source: 'knowledge', target: 'tracking', animated: true },
    { id: 'e-tracking-personality', source: 'tracking', target: 'personality', animated: true },
    { id: 'e-personality-actions', source: 'personality', target: 'actions', animated: true },
    { id: 'e-actions-validation', source: 'actions', target: 'validation', animated: true },
    { id: 'e-validation-output', source: 'validation', target: 'output', animated: true }
  );

  // ADD NODE EDGES REMOVED - Temporarily disabled

  // ============================================================
  // CONFIGURATION NODES (Side Attachments - Editable)
  // ============================================================

  // Knowledge Visualization (3D canvas) - STUB: always show with many cubes
  nodes.push({
    id: 'knowledge_viz',
    type: 'knowledgeVizNode',
    position: positions.knowledge_viz,
    data: {
      id: 'knowledge_viz',
      blockCount: knowledgeBlocks.length || 12, // Lots of cubes
      chunks: 450, // Stub
      tags: ['pricing', 'products', 'faq', 'policies', 'services'], // Stub
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

  // Filter Node (gating_rules)
  if (agentConfig?.gating_rules?.length > 0) {
    nodes.push({
      id: 'filter_config',
      type: 'filterNode',
      position: positions.filter_config,
      data: {
        id: 'filter_config',
        rules: agentConfig.gating_rules,
        onEdit: handlers.onEditFilter,
      },
      draggable: true,
    });

    // Edge: Filter → Knowledge (dotted, shows dependency)
    edges.push({
      id: 'e-filter-knowledge',
      source: 'filter_config',
      target: 'knowledge',
      type: 'smoothstep',
      style: { stroke: '#2196f3', strokeDasharray: '5 5' },
      animated: false,
    });
  }

  // Fields Node (response_schema) - STUB: always show with sample data
  nodes.push({
    id: 'fields_config',
    type: 'fieldsNode',
    position: positions.fields_config,
    data: {
      id: 'fields_config',
      fields: agentConfig?.response_schema || {
        budget_range: ['unknown', 'low', 'medium', 'high'],
        urgency: ['normal', 'urgent'],
        sentiment: ['neutral', 'positive', 'negative'],
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

  // Tone Node (personality tone) - STUB: always show with sample data
  nodes.push({
    id: 'tone_config',
    type: 'toneNode',
    position: positions.tone_config,
    data: {
      id: 'tone_config',
      tone: firstPersonalityBlock.tone || 'professional',
      useEmojis: firstPersonalityBlock.use_emojis || false,
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

  // Tools Node (agent.tools) - STUB: always show with sample data
  nodes.push({
    id: 'tools_config',
    type: 'toolsNode',
    position: positions.tools_config,
    data: {
      id: 'tools_config',
      tools: agentConfig?.tools || [
        { type: 'calendar', name: 'Calendário' },
        { type: 'payment', name: 'Pagamentos' },
      ],
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

  // Handoffs Node (escalation triggers) - STUB: always show with sample data
  nodes.push({
    id: 'handoffs_config',
    type: 'handoffsNode',
    position: positions.handoffs_config,
    data: {
      id: 'handoffs_config',
      triggers: [
        { type: 'angry', condition: 'Cliente frustrado', action: 'Escalar imediatamente', urgent: true },
        { type: 'complex', condition: 'Questão complexa', action: 'Conectar com especialista' },
      ],
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

  // Corrections Node (validation_rules)
  if (agentConfig?.validation_rules?.length > 0) {
    nodes.push({
      id: 'corrections_config',
      type: 'correctionsNode',
      position: positions.corrections_config,
      data: {
        id: 'corrections_config',
        rules: agentConfig.validation_rules,
        onEdit: handlers.onEditCorrections,
      },
      draggable: true,
    });

    // Edge: Corrections → Validation
    edges.push({
      id: 'e-corrections-validation',
      source: 'corrections_config',
      target: 'validation',
      type: 'smoothstep',
      style: { stroke: '#2e7d32', strokeDasharray: '5 5' },
      animated: false,
    });
  }

  // Files Node (media_rules)
  if (agentConfig?.media_rules && Object.keys(agentConfig.media_rules).length > 0) {
    nodes.push({
      id: 'files_config',
      type: 'filesNode',
      position: positions.files_config,
      data: {
        id: 'files_config',
        mediaRules: agentConfig.media_rules,
        onEdit: handlers.onEditFiles,
      },
      draggable: true,
    });

    // Edge: Files → Tracking
    edges.push({
      id: 'e-files-tracking',
      source: 'files_config',
      target: 'tracking',
      type: 'smoothstep',
      style: { stroke: '#ed6c02', strokeDasharray: '5 5' },
      animated: false,
    });
  }

  // Style Node (multi_turn_config)
  if (agentConfig?.multi_turn_config?.enabled) {
    nodes.push({
      id: 'style_config',
      type: 'styleNode',
      position: positions.style_config,
      data: {
        id: 'style_config',
        config: agentConfig.multi_turn_config,
        onEdit: handlers.onEditStyle,
      },
      draggable: true,
    });

    // Edge: Style → Personality
    edges.push({
      id: 'e-style-personality',
      source: 'style_config',
      target: 'personality',
      type: 'smoothstep',
      style: { stroke: '#9c27b0', strokeDasharray: '5 5' },
      animated: false,
    });
  }

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
