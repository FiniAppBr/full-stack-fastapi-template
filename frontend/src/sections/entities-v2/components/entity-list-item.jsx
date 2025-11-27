import { useState } from 'react';
import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';
import { LinkButton } from 'src/components/link-button';

import { colorWithOpacity } from '../constants';

// ----------------------------------------------------------------------

/**
 * Single entity row in the entity list.
 */
export function EntityListItem({
  entity,
  color,
  onEdit,
  onDelete,
  onRefresh,
  compact = false,
}) {
  const { id, name, description, template, category, is_processed } = entity;
  const [processing, setProcessing] = useState(false);

  const displayType = template || category || 'item';

  const handleProcess = async (e) => {
    e.stopPropagation();
    setProcessing(true);
    try {
      await axios.post(endpoints.entities.process(id));
      onRefresh?.();
    } catch (error) {
      console.error('Failed to process:', error);
    } finally {
      setProcessing(false);
    }
  };

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
          '& .entity-actions': { opacity: 1 },
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

        {/* Link & Process status */}
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          onClick={(e) => e.stopPropagation()}
        >
          <LinkButton entityId={id} size="small" />

          <Chip
            label={processing ? '' : is_processed ? 'OK' : 'Processar'}
            size="small"
            icon={processing ? <CircularProgress size={12} /> : <Iconify icon="solar:cpu-bolt-bold" width={12} />}
            onClick={handleProcess}
            disabled={processing}
            sx={{
              height: 24,
              cursor: 'pointer',
              fontSize: '0.7rem',
              '& .MuiChip-label': { px: is_processed ? 0.5 : 1 },
              ...(is_processed
                ? {
                    bgcolor: 'success.lighter',
                    color: 'success.dark',
                    '& .MuiChip-icon': { color: 'success.main' },
                  }
                : {
                    bgcolor: 'warning.lighter',
                    color: 'warning.dark',
                    '& .MuiChip-icon': { color: 'warning.main' },
                  }),
            }}
          />
        </Stack>

        {/* Edit/Delete actions */}
        <Stack
          className="entity-actions"
          direction="row"
          spacing={0.5}
          sx={{ opacity: { xs: 1, sm: 0 }, transition: 'opacity 0.2s' }}
        >
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            sx={{ width: 32, height: 32, '&:hover': { bgcolor: colorWithOpacity(color, 0.1), color } }}
          >
            <Iconify icon="solar:pen-bold" width={16} />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            sx={{ width: 32, height: 32, '&:hover': { bgcolor: 'error.lighter', color: 'error.main' } }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
          </IconButton>
        </Stack>
      </ButtonBase>
    </Box>
  );
}

// ----------------------------------------------------------------------

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
          '&:hover': { bgcolor: colorWithOpacity(color, 0.2) },
        }}
      >
        <Iconify icon="mingcute:add-line" width={18} sx={{ mr: 0.75 }} />
        Adicionar primeiro
      </ButtonBase>
    </Box>
  );
}
