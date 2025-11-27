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
 * Entity list view - shows entities for a card with quick-add template chips.
 */
export function EntityListView({
  card,
  templates = [],
  entities = [],
  onBack,
  onEdit,
  onDelete,
  onAdd,
  compact = false,
}) {
  if (!card) return null;

  const { color } = card;

  return (
    <Box>
      <BackHeader
        title={card.title}
        subtitle={card.subtitle}
        icon={card.icon}
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
              '&:hover': { bgcolor: color, filter: 'brightness(0.9)' },
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
            {templates.map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                icon={<Iconify icon={t.icon} width={16} />}
                onClick={() => onAdd(t.id)}
                sx={{
                  bgcolor: colorWithOpacity(color, 0.1),
                  color,
                  fontWeight: 500,
                  '&:hover': { bgcolor: colorWithOpacity(color, 0.2) },
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Entity List */}
      {entities.length === 0 ? (
        <EntityListEmpty color={color} onAdd={() => onAdd()} compact={compact} />
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
                  onRefresh={() => {}}
                  compact
                />
              </StaggerItem>
            ))}
          </Stack>
        </StaggerContainer>
      )}
    </Box>
  );
}
