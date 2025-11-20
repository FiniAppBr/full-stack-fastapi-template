/**
 * Shared node styling system for React Flow builder
 * All measurements in MUI theme spacing units
 */

export const NODE_WIDTHS = {
  pipeline: 320,
  config: 280,
};

// Pipeline node icon configuration
export const PIPELINE_NODE_CONFIG = {
  iconSize: 32,
  iconColor: 'text.primary',
  titleVariant: 'h6',
  titleWeight: 600,
};

// Pipeline node type-specific colors
export const PIPELINE_COLORS = {
  knowledge: {
    border: '#90CAF9', // Light blue
    accent: '#2196F3', // Blue
  },
  tracking: {
    border: '#FFB74D', // Light orange
    accent: '#FF9800', // Orange
  },
  personality: {
    border: '#CE93D8', // Light purple
    accent: '#9C27B0', // Purple
  },
  actions: {
    border: '#EF5350', // Light red
    accent: '#F44336', // Red
  },
  validation: {
    border: '#B0BEC5', // Light grey/blue-grey
    accent: '#607D8B', // Blue-grey
  },
};

export const NODE_COLORS = {
  // Pipeline nodes (spine - read-only)
  pipeline: {
    background: 'grey.50',
    border: 'grey.300',
    text: 'text.primary',
  },
  // Configuration nodes (editable)
  filter: {
    background: 'info.lighter',
    border: 'grey.300',
    accent: 'info.main',
  },
  tracking: {
    background: 'primary.lighter',
    border: 'grey.300',
    accent: 'primary.main',
  },
  corrections: {
    background: 'success.lighter',
    border: 'grey.300',
    accent: 'success.main',
  },
  files: {
    background: 'warning.lighter',
    border: 'grey.300',
    accent: 'warning.main',
  },
  style: {
    background: 'secondary.lighter',
    border: 'grey.300',
    accent: 'secondary.main',
  },
};

export const getNodeBaseStyles = (type = 'pipeline') => ({
  bgcolor: NODE_COLORS[type]?.background || 'background.paper',
  border: 2,
  borderColor: NODE_COLORS[type]?.border || 'divider',
  borderRadius: 2,
  boxShadow: (theme) => theme.customShadows.z8,
  minWidth: type === 'pipeline' ? NODE_WIDTHS.pipeline : NODE_WIDTHS.config,
  maxWidth: type === 'pipeline' ? NODE_WIDTHS.pipeline : NODE_WIDTHS.config,
  overflow: 'hidden',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: (theme) => theme.customShadows.z16,
    borderColor: NODE_COLORS[type]?.accent || NODE_COLORS[type]?.border || 'primary.light',
  },
});

export const getNodeHeaderStyles = (type = 'pipeline') => ({
  p: 1.5,
  bgcolor: NODE_COLORS[type]?.background || 'grey.100',
  borderBottom: 1,
  borderColor: 'divider',
  display: 'flex',
  alignItems: 'center',
  gap: 1,
});

export const getNodeBodyStyles = () => ({
  p: 2,
});

export const getBadgeStyles = (type = 'pipeline') => ({
  bgcolor: NODE_COLORS[type]?.accent || 'primary.main',
  color: 'white',
  px: 1,
  py: 0.5,
  borderRadius: 1,
  fontSize: '0.75rem',
  fontWeight: 600,
});

export const getStatLineStyles = () => ({
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  py: 0.5,
  color: 'text.secondary',
  fontSize: '0.875rem',
});

export const COMPLEXITY_LEVELS = {
  simple: { color: 'success.main', label: 'Simples', range: [1, 2] },
  moderate: { color: 'warning.main', label: 'Moderado', range: [3, 6] },
  advanced: { color: 'warning.dark', label: 'Avançado', range: [7, 12] },
  complex: { color: 'error.main', label: 'Complexo', range: [13, Infinity] },
};

export const getComplexityLevel = (configCount) => {
  const entries = Object.entries(COMPLEXITY_LEVELS);

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const [min, max] = value.range;
    if (configCount >= min && configCount <= max) {
      return { key, ...value };
    }
  }

  return { key: 'simple', ...COMPLEXITY_LEVELS.simple };
};
