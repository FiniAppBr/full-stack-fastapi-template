/**
 * Node Builder - Transforms agent configuration into React Flow nodes and edges
 * This is the core transformation layer between backend data and UI representation
 */

import { generateLayout } from './node-positions';

/**
 * Build React Flow nodes and edges from agent configuration
 * @param {object} agentConfig - Agent configuration from backend API
 * @param {object} handlers - Event handlers { onEditFilter, onEditTracking, ... }
 * @param {object} stats - Latest execution stats (optional)
 * @returns {object} { nodes, edges }
 */
export function buildFlowFromConfig(agentConfig, handlers = {}, stats = {}) {
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
      channel: 'whatsapp', // TODO: Make dynamic based on agent config
      direction: 'input',
    },
    draggable: false,
  });

  // Knowledge Search node
  nodes.push({
    id: 'knowledge',
    type: 'knowledgeNode',
    position: positions.knowledge,
    data: {
      id: 'knowledge',
      stats: stats.knowledge || {},
    },
    draggable: false,
  });

  // Tracking node
  nodes.push({
    id: 'tracking',
    type: 'trackingNode',
    position: positions.tracking,
    data: {
      id: 'tracking',
      stats: stats.tracking || {},
    },
    draggable: false,
  });

  // Validation node
  nodes.push({
    id: 'validation',
    type: 'validationNode',
    position: positions.validation,
    data: {
      id: 'validation',
      stats: stats.validation || {},
    },
    draggable: false,
  });

  // Personality node
  nodes.push({
    id: 'personality',
    type: 'personalityNode',
    position: positions.personality,
    data: {
      id: 'personality',
      stats: stats.personality || {},
    },
    draggable: false,
  });

  // Communication Output node
  nodes.push({
    id: 'output',
    type: 'communicationNode',
    position: positions.output,
    data: {
      channel: 'whatsapp', // TODO: Make dynamic based on agent config
      direction: 'output',
    },
    draggable: false,
  });

  // ============================================================
  // PIPELINE EDGES (Vertical Flow)
  // ============================================================

  edges.push(
    { id: 'e-input-knowledge', source: 'input', target: 'knowledge', animated: true },
    { id: 'e-knowledge-tracking', source: 'knowledge', target: 'tracking', animated: true },
    { id: 'e-tracking-validation', source: 'tracking', target: 'validation', animated: true },
    { id: 'e-validation-personality', source: 'validation', target: 'personality', animated: true },
    { id: 'e-personality-output', source: 'personality', target: 'output', animated: true }
  );

  // ============================================================
  // CONFIGURATION NODES (Side Attachments - Editable)
  // ============================================================

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

  // Data Tracking Node (response_schema)
  if (agentConfig?.response_schema) {
    nodes.push({
      id: 'tracking_config',
      type: 'dataTrackingNode',
      position: positions.tracking_config,
      data: {
        id: 'tracking_config',
        schema: agentConfig.response_schema,
        onEdit: handlers.onEditTracking,
      },
      draggable: true,
    });

    // Edge: Tracking Config → Tracking Pipeline
    edges.push({
      id: 'e-tracking-config-tracking',
      source: 'tracking_config',
      target: 'tracking',
      type: 'smoothstep',
      style: { stroke: '#1976d2', strokeDasharray: '5 5' },
      animated: false,
    });
  }

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

    // Edge: Files → Output
    edges.push({
      id: 'e-files-output',
      source: 'files_config',
      target: 'output',
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

    // Edge: Style → Output
    edges.push({
      id: 'e-style-output',
      source: 'style_config',
      target: 'output',
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
