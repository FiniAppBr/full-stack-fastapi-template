import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';

import { Iconify } from 'src/components/iconify';

import { colorWithOpacity } from '../constants';

/**
 * Single entity row in the entity list.
 *
 * @param {Object} props
 * @param {Object} props.entity - Entity data
 * @param {string} props.color - Accent color from parent card
 * @param {Function} props.onEdit - Edit callback
 * @param {Function} props.onDelete - Delete callback
 * @param {boolean} props.compact - Compact mode for embedded use
 */
export function EntityListItem({
  entity,
  color,
  onEdit,
  onDelete,
  compact = false,
}) {
  const { name, description, template, category } = entity;

  // Get a display type from template or category
  const displayType = template || category || 'item';

  return (
    <Box
      component={m.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      sx={{
        width: '100%',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: colorWithOpacity(color, 0.3),
          boxShadow: `0 2px 8px ${colorWithOpacity(color, 0.08)}`,
          '& .entity-actions': {
            opacity: 1,
          },
        },
      }}
    >
      <ButtonBase
        onClick={onEdit}
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          textAlign: 'left',
          px: compact ? 1.5 : 2,
          py: compact ? 1 : 1.5,
          gap: compact ? 1.5 : 2,
        }}
      >
        {/* Type indicator */}
        <Box
          sx={{
            width: 4,
            height: compact ? 32 : 40,
            borderRadius: 1,
            bgcolor: color,
            flexShrink: 0,
          }}
        />

        {/* Content */}
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant={compact ? 'body2' : 'subtitle2'}
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </Typography>
          {description && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {description}
            </Typography>
          )}
        </Stack>

        {/* Type badge */}
        <Typography
          variant="caption"
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 0.75,
            bgcolor: colorWithOpacity(color, 0.08),
            color,
            fontWeight: 500,
            textTransform: 'capitalize',
            flexShrink: 0,
          }}
        >
          {displayType.replace(/_/g, ' ')}
        </Typography>

        {/* Actions */}
        <Stack
          className="entity-actions"
          direction="row"
          spacing={0.5}
          sx={{
            opacity: { xs: 1, sm: 0 },
            transition: 'opacity 0.2s',
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            sx={{
              width: 32,
              height: 32,
              '&:hover': {
                bgcolor: colorWithOpacity(color, 0.1),
                color,
              },
            }}
          >
            <Iconify icon="solar:pen-bold" width={16} />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            sx={{
              width: 32,
              height: 32,
              '&:hover': {
                bgcolor: 'error.lighter',
                color: 'error.main',
              },
            }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
          </IconButton>
        </Stack>
      </ButtonBase>
    </Box>
  );
}

/**
 * Empty state for when there are no entities
 */
export function EntityListEmpty({ color, onAdd, compact = false }) {
  return (
    <Box
      component={m.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      sx={{
        py: compact ? 4 : 6,
        px: 3,
        textAlign: 'center',
        borderRadius: 2,
        border: '2px dashed',
        borderColor: 'divider',
        bgcolor: 'background.neutral',
      }}
    >
      <Iconify
        icon="solar:inbox-line-bold-duotone"
        width={compact ? 40 : 56}
        sx={{ color: 'text.disabled', mb: 2 }}
      />
      <Typography
        variant={compact ? 'body2' : 'body1'}
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        Nenhum item ainda
      </Typography>
      <ButtonBase
        onClick={onAdd}
        sx={{
          px: 2,
          py: 1,
          borderRadius: 1.5,
          bgcolor: colorWithOpacity(color, 0.1),
          color,
          fontWeight: 600,
          fontSize: compact ? '0.8rem' : '0.875rem',
          transition: 'background-color 0.2s',
          '&:hover': {
            bgcolor: colorWithOpacity(color, 0.2),
          },
        }}
      >
        <Iconify icon="mingcute:add-line" width={18} sx={{ mr: 0.75 }} />
        Adicionar primeiro
      </ButtonBase>
    </Box>
  );
}
