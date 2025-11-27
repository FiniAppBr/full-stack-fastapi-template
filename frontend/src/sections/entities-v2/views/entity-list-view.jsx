import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { colorWithOpacity } from '../constants';
import { BackHeader } from '../components/back-header';
import { EntityListItem, EntityListEmpty } from '../components/entity-list-item';
import { StaggerContainer, StaggerItem } from '../components/animated-view';

/**
 * View showing list of entities for a category.
 * Shows templates as quick-add chips.
 */
export function EntityListView({
  category,
  entities = [],
  onBack,
  onEdit,
  onDelete,
  onAdd,
  compact = false,
}) {
  if (!category) return null;

  const { color, templates = [] } = category;

  return (
    <Box>
      {/* Header */}
      <BackHeader
        title={category.title}
        subtitle={category.subtitle}
        icon={category.icon}
        color={color}
        onBack={onBack}
        compact={compact}
        action={
          <Button
            size={compact ? 'small' : 'medium'}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => onAdd()}
            sx={{
              bgcolor: color,
              '&:hover': {
                bgcolor: color,
                filter: 'brightness(0.9)',
              },
            }}
          >
            Adicionar
          </Button>
        }
      />

      {/* Quick-add template chips */}
      {templates.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Adicionar rapidamente:
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {templates.map((template) => (
              <Chip
                key={template.id}
                label={template.name}
                icon={<Iconify icon={template.icon} width={16} />}
                onClick={() => onAdd(template.id)}
                sx={{
                  bgcolor: colorWithOpacity(color, 0.1),
                  color,
                  fontWeight: 500,
                  '&:hover': {
                    bgcolor: colorWithOpacity(color, 0.2),
                  },
                  '& .MuiChip-icon': {
                    color: 'inherit',
                  },
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Entity List */}
      {entities.length === 0 ? (
        <EntityListEmpty
          color={color}
          onAdd={() => onAdd()}
          compact={compact}
        />
      ) : (
        <StaggerContainer>
          <Stack spacing={compact ? 1 : 1.5}>
            {entities.map((entity) => (
              <StaggerItem key={entity.id}>
                <EntityListItem
                  entity={entity}
                  color={color}
                  onEdit={() => onEdit?.(entity)}
                  onDelete={() => onDelete?.(entity)}
                  compact={compact}
                />
              </StaggerItem>
            ))}
          </Stack>
        </StaggerContainer>
      )}
    </Box>
  );
}
