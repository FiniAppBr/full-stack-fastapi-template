import PropTypes from 'prop-types';
import { Handle, Position } from '@xyflow/react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

import { getNodeBaseStyles, getNodeBodyStyles, getNodeHeaderStyles } from '../utils/node-styles';

/**
 * BaseNode - Shared component for all React Flow nodes
 * Provides consistent structure and styling
 */
export function BaseNode({
  // Node identity
  id,
  type = 'pipeline',

  // Header config
  icon,
  iconSize = 20,
  iconColor = 'text.primary',
  title,
  badge,
  editable = false,
  onEdit,

  // Tooltip
  tooltip,

  // Children (body content)
  children,

  // Handles
  sourceHandle = true,
  targetHandle = true,

  // Custom styles
  sx = {},
}) {
  return (
    <Box sx={{ ...getNodeBaseStyles(type), ...sx }}>
      {/* Target Handle (top) */}
      {targetHandle && <Handle type="target" position={Position.Top} />}

      {/* Header */}
      <Box sx={getNodeHeaderStyles(type)}>
        {icon && (
          <Iconify
            icon={icon}
            width={iconSize}
            sx={{
              color: iconColor,
            }}
          />
        )}

        <Tooltip title={tooltip || ''} arrow placement="top">
          <Typography
            variant="subtitle2"
            sx={{
              flex: 1,
              fontWeight: (theme) => theme.typography.fontWeightSemiBold,
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
        </Tooltip>

        {badge && (
          <Chip
            label={badge}
            size="small"
            sx={{
              height: 22,
              '& .MuiChip-label': {
                fontSize: (theme) => theme.typography.caption.fontSize,
                fontWeight: (theme) => theme.typography.fontWeightSemiBold,
              },
            }}
          />
        )}

        {editable && (
          <IconButton size="small" onClick={onEdit} sx={{ ml: 'auto' }}>
            <Iconify icon="mdi:pencil" width={16} />
          </IconButton>
        )}
      </Box>

      {/* Body */}
      <Box sx={getNodeBodyStyles()}>{children}</Box>

      {/* Source Handle (bottom) */}
      {sourceHandle && <Handle type="source" position={Position.Bottom} />}
    </Box>
  );
}

BaseNode.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['pipeline', 'filter', 'tracking', 'corrections', 'files', 'style']),
  icon: PropTypes.string,
  iconSize: PropTypes.number,
  iconColor: PropTypes.string,
  title: PropTypes.string.isRequired,
  badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  editable: PropTypes.bool,
  onEdit: PropTypes.func,
  tooltip: PropTypes.string,
  children: PropTypes.node,
  sourceHandle: PropTypes.bool,
  targetHandle: PropTypes.bool,
  sx: PropTypes.shape({}),
};
