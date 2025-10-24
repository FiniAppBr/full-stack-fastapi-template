// Centralized styling configuration for React Flow nodes

export const nodeStyles = {
  // Border radius
  borderRadius: {
    agent: 1,      // 4px
    stage: 1,      // 4px
    endState: 1,   // 4px
  },

  // Border width
  borderWidth: {
    default: 2,
    selected: 2,
  },

  // Box shadows
  shadow: {
    default: 1,
    hover: 2,
    selected: 3,
    agent: 2,
    agentSelected: 4,
  },

  // Spacing
  padding: {
    agent: { px: 3, py: 2 },
    stage: { px: 2, py: 1.5 },
    endState: { px: 2.5, py: 2 },
  },

  // Minimum widths
  minWidth: {
    agent: 300,
    stage: 280,
    endState: 180,
  },

  // Icon sizes
  iconSize: {
    header: 20,
    summary: 14,
    agentHeader: 24,
    endState: 18,
  },

  // Handle styles
  handle: {
    width: 12,
    height: 12,
    borderWidth: 2,
  },

  // Transitions
  transition: 'all 0.2s ease-in-out',
};
