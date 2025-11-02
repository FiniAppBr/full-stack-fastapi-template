/**
 * Node positioning and layout calculation
 * Creates the vertical spine + side attachments layout
 */

const SPINE_X = 300; // X position for vertical spine
const SPINE_START_Y = 100;
const SPINE_SPACING = 200; // Vertical spacing between pipeline nodes

const CONFIG_OFFSET_X = 120; // Horizontal offset for config nodes
const CONFIG_SPACING_Y = 60; // Vertical spacing when multiple configs attach to same pipeline node

const ADD_NODE_OFFSET_X = 400; // Horizontal offset for Add nodes (to the right of pipeline nodes)
const PIPELINE_NODE_HEIGHT_APPROX = 100; // Approximate height of pipeline nodes
const ADD_NODE_SIZE = 48; // Size of Add node (square)
const ADD_NODE_Y_OFFSET = (PIPELINE_NODE_HEIGHT_APPROX - ADD_NODE_SIZE) / 2; // Vertically center Add nodes

/**
 * Calculate positions for pipeline nodes (vertical spine)
 */
export const getPipelineNodePositions = () => ({
    input: { x: SPINE_X, y: SPINE_START_Y },
    knowledge: { x: SPINE_X, y: SPINE_START_Y + SPINE_SPACING },
    tracking: { x: SPINE_X, y: SPINE_START_Y + SPINE_SPACING * 2 },
    personality: { x: SPINE_X, y: SPINE_START_Y + SPINE_SPACING * 3 },
    actions: { x: SPINE_X, y: SPINE_START_Y + SPINE_SPACING * 4 },
    validation: { x: SPINE_X, y: SPINE_START_Y + SPINE_SPACING * 5 },
    output: { x: SPINE_X, y: SPINE_START_Y + SPINE_SPACING * 6 },
  });

/**
 * Calculate position for a config node attached to a pipeline node
 * @param {string} pipelineNodeId - ID of pipeline node to attach to
 * @param {number} attachmentIndex - Index if multiple configs attach to same pipeline node
 */
export const getConfigNodePosition = (pipelineNodeId, attachmentIndex = 0) => {
  const pipelinePositions = getPipelineNodePositions();
  const pipelinePos = pipelinePositions[pipelineNodeId];

  if (!pipelinePos) {
    console.warn(`Unknown pipeline node: ${pipelineNodeId}`);
    return { x: 0, y: 0 };
  }

  return {
    x: pipelinePos.x + CONFIG_OFFSET_X + 320, // 320 is pipeline node width
    y: pipelinePos.y + (attachmentIndex * CONFIG_SPACING_Y),
  };
};

/**
 * Generate layout for all nodes based on agent configuration
 * @param {object} agentConfig - Agent configuration from backend
 * @returns {object} Map of node IDs to positions
 */
export const generateLayout = (agentConfig) => {
  const positions = {};
  const pipelinePositions = getPipelineNodePositions();

  // Pipeline nodes (spine)
  Object.entries(pipelinePositions).forEach(([id, pos]) => {
    positions[id] = pos;
  });

  // Add nodes (to the right of pipeline nodes, vertically centered)
  positions.add_knowledge = { x: SPINE_X + ADD_NODE_OFFSET_X, y: SPINE_START_Y + SPINE_SPACING + ADD_NODE_Y_OFFSET };
  positions.add_tracking = { x: SPINE_X + ADD_NODE_OFFSET_X, y: SPINE_START_Y + SPINE_SPACING * 2 + ADD_NODE_Y_OFFSET };
  positions.add_personality = { x: SPINE_X + ADD_NODE_OFFSET_X, y: SPINE_START_Y + SPINE_SPACING * 3 + ADD_NODE_Y_OFFSET };
  positions.add_actions = { x: SPINE_X + ADD_NODE_OFFSET_X, y: SPINE_START_Y + SPINE_SPACING * 4 + ADD_NODE_Y_OFFSET };
  positions.add_validation = { x: SPINE_X + ADD_NODE_OFFSET_X, y: SPINE_START_Y + SPINE_SPACING * 5 + ADD_NODE_Y_OFFSET };

  // Config nodes (side attachments)
  let knowledgeAttachments = 0;
  let trackingAttachments = 0;
  let personalityAttachments = 0;
  let actionsAttachments = 0;
  let validationAttachments = 0;

  // Knowledge Visualization (3D canvas) - STUB: always show
  positions.knowledge_viz = getConfigNodePosition('knowledge', knowledgeAttachments);
  knowledgeAttachments += 1;

  // Filter node (attached to Knowledge)
  if (agentConfig?.gating_rules?.length > 0) {
    positions.filter_config = getConfigNodePosition('knowledge', knowledgeAttachments);
    knowledgeAttachments += 1;
  }

  // Fields node (attached to Tracking) - STUB: always show
  positions.fields_config = getConfigNodePosition('tracking', trackingAttachments);
  trackingAttachments += 1;

  // Tone node (attached to Personality) - STUB: always show
  positions.tone_config = getConfigNodePosition('personality', personalityAttachments);
  personalityAttachments += 1;

  // Style node (attached to Personality)
  if (agentConfig?.multi_turn_config?.enabled) {
    positions.style_config = getConfigNodePosition('personality', personalityAttachments);
    personalityAttachments += 1;
  }

  // Tools node (attached to Actions) - STUB: always show
  positions.tools_config = getConfigNodePosition('actions', actionsAttachments);
  actionsAttachments += 1;

  // Corrections node (attached to Validation)
  if (agentConfig?.validation_rules?.length > 0) {
    positions.corrections_config = getConfigNodePosition('validation', validationAttachments);
    validationAttachments += 1;
  }

  // Handoffs node (attached to Validation) - STUB: always show
  positions.handoffs_config = getConfigNodePosition('validation', validationAttachments);
  validationAttachments += 1;

  return positions;
};

/**
 * Calculate canvas bounds for fitView
 */
export const getCanvasBounds = (positions) => {
  const xValues = Object.values(positions).map((p) => p.x);
  const yValues = Object.values(positions).map((p) => p.y);

  return {
    minX: Math.min(...xValues) - 100,
    maxX: Math.max(...xValues) + 400,
    minY: Math.min(...yValues) - 100,
    maxY: Math.max(...yValues) + 300,
  };
};
