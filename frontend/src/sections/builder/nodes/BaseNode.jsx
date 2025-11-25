import PropTypes from 'prop-types';
import { Handle, Position } from '@xyflow/react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

import { PIPELINE_COLORS, getNodeBaseStyles, getNodeBodyStyles, getNodeHeaderStyles } from '../utils/node-styles';

/**
 * BaseNode - Shared component for all React Flow nodes
 * Provides consistent structure and styling
 */
export function BaseNode({
  // Node identity
  id,
  type = 'pipeline',
  pipelineType, // 'knowledge', 'tracking', 'personality', 'actions', 'validation'

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
  rightHandle = false,
  leftHandle = false,

  // Custom styles
  sx = {},
}) {
  // Apply pipeline-specific border color if pipelineType is provided
  const pipelineBorderColor = pipelineType && PIPELINE_COLORS[pipelineType]?.border;
  const pipelineAccentColor = pipelineType && PIPELINE_COLORS[pipelineType]?.accent;

  return (
    <Box sx={{
      ...getNodeBaseStyles(type),
      ...(pipelineBorderColor && {
        borderColor: pipelineBorderColor,
        '&:hover': {
          boxShadow: (theme) => theme.customShadows.z16,
          borderColor: pipelineAccentColor,
        },
      }),
      ...sx
    }}>
      {/* Target Handle (top) */}
      {targetHandle && <Handle type="target" position={Position.Top} />}

      {/* Left Handle (target for config nodes) */}
      {leftHandle && <Handle type="target" position={Position.Left} id="left" />}

      {/* Header */}
      <Box sx={{
        ...getNodeHeaderStyles(type),
        ...(pipelineType && {
          background: `linear-gradient(135deg, ${PIPELINE_COLORS[pipelineType]?.border}15, transparent 60%)`,
        }),
      }}>
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
            variant="subtitle1"
            sx={{
              flex: 1,
              fontWeight: (theme) => theme.typography.fontWeightSemiBold,
              color: 'text.primary',
              fontSize: type === 'pipeline' ? '1.125rem' : undefined,
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

      {/* Right Handle */}
      {rightHandle && <Handle type="source" position={Position.Right} id="right" />}
    </Box>
  );
}

BaseNode.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['pipeline', 'filter', 'tracking', 'corrections', 'files', 'style']),
  pipelineType: PropTypes.oneOf(['knowledge', 'tracking', 'personality', 'actions', 'validation']),
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
  rightHandle: PropTypes.bool,
  leftHandle: PropTypes.bool,
  sx: PropTypes.shape({}),
};
