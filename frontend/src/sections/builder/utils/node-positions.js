/**
 * Node positioning and layout calculation
 * Creates the vertical spine + side attachments layout
 */

const SPINE_X = 300; // X position for vertical spine
const SPINE_START_Y = 100;
const SPINE_SPACING = 200; // Vertical spacing between pipeline nodes

const CONFIG_OFFSET_X = 120; // Horizontal offset for config nodes
const CONFIG_SPACING_Y = 60; // Vertical spacing when multiple configs attach to same pipeline node

/**
 * Calculate positions for pipeline nodes (vertical spine)
 */
export const getPipelineNodePositions = () => {
  return {
    input: { x: SPINE_X, y: SPINE_START_Y },
    knowledge: { x: SPINE_X, y: SPINE_START_Y + SPINE_SPACING },
    tracking: { x: SPINE_X, y: SPINE_START_Y + SPINE_SPACING * 2 },
    validation: { x: SPINE_X, y: SPINE_START_Y + SPINE_SPACING * 3 },
    output: { x: SPINE_X, y: SPINE_START_Y + SPINE_SPACING * 4 },
  };
};

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

  // Config nodes (side attachments)
  let knowledgeAttachments = 0;
  let trackingAttachments = 0;
  let validationAttachments = 0;
  let outputAttachments = 0;

  // Filter node
  if (agentConfig?.gating_rules?.length > 0) {
    positions.filter_config = getConfigNodePosition('knowledge', knowledgeAttachments++);
  }

  // Tracking node
  if (agentConfig?.response_schema) {
    positions.tracking_config = getConfigNodePosition('tracking', trackingAttachments++);
  }

  // Corrections node
  if (agentConfig?.validation_rules?.length > 0) {
    positions.corrections_config = getConfigNodePosition('validation', validationAttachments++);
  }

  // Files node
  if (agentConfig?.media_rules && Object.keys(agentConfig.media_rules).length > 0) {
    positions.files_config = getConfigNodePosition('output', outputAttachments++);
  }

  // Style node
  if (agentConfig?.multi_turn_config?.enabled) {
    positions.style_config = getConfigNodePosition('output', outputAttachments++);
  }

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
