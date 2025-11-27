import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { Iconify } from 'src/components/iconify';

import { BackHeader } from '../components/back-header';
import { EntityListItem, EntityListEmpty } from '../components/entity-list-item';
import { StaggerContainer, StaggerItem } from '../components/animated-view';

/**
 * View showing list of entities for a selected subcard.
 *
 * @param {Object} props
 * @param {Object} props.mainCard - Parent main card definition
 * @param {Object} props.subcard - The selected subcard definition
 * @param {Array} props.entities - List of entities to display
 * @param {Function} props.onBack - Callback to go back to subcards
 * @param {Function} props.onEdit - Callback when editing an entity
 * @param {Function} props.onDelete - Callback when deleting an entity
 * @param {Function} props.onAdd - Callback when adding a new entity
 * @param {boolean} props.compact - Compact mode for embedded use
 */
export function EntityListView({
  mainCard,
  subcard,
  entities = [],
  onBack,
  onEdit,
  onDelete,
  onAdd,
  compact = false,
}) {
  if (!mainCard || !subcard) return null;

  const color = mainCard.color;

  return (
    <Box>
      {/* Header */}
      <BackHeader
        title={subcard.title}
        subtitle={subcard.subtitle}
        icon={subcard.icon}
        color={color}
        onBack={onBack}
        compact={compact}
        action={
          <Button
            size={compact ? 'small' : 'medium'}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={onAdd}
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

      {/* Entity List */}
      {entities.length === 0 ? (
        <EntityListEmpty
          color={color}
          onAdd={onAdd}
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
