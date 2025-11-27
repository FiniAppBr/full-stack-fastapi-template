import { memo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { MAIN_CARDS } from 'src/sections/entities-v2/data/card-definitions';

import { useFormField, useFormActions } from '../agent-form-context';
import { KnowledgeModal } from '../knowledge-modal';

// ----------------------------------------------------------------------

/**
 * Knowledge section for neo-agent form.
 * Uses new KnowledgeModal with category cards and auto-linking.
 */
export const KnowledgeSection = memo(({ availableEntities }) => {
  const linkedEntities = useFormField('linkedEntities');
  const { setField } = useFormActions();

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => setDialogOpen(true);
  const handleCloseDialog = () => setDialogOpen(false);

  const handleAddEntity = (entityId) => {
    if (!linkedEntities.includes(entityId)) {
      setField('linkedEntities', [...linkedEntities, entityId]);
    }
  };

  const handleRemoveEntity = (entityId) => {
    setField('linkedEntities', linkedEntities.filter((id) => id !== entityId));
  };

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          O que seu agente deve saber?
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<Iconify icon="solar:settings-bold-duotone" />}
          onClick={handleOpenDialog}
        >
          Configurar
        </Button>
      </Stack>

      {/* Summary Cards Preview */}
      <EntitySummaryPreview
        linkedEntities={linkedEntities}
        availableEntities={availableEntities}
        onOpenDialog={handleOpenDialog}
      />

      {/* Knowledge Modal */}
      <KnowledgeModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        linkedEntities={linkedEntities}
        availableEntities={availableEntities}
        onAddEntity={handleAddEntity}
        onRemoveEntity={handleRemoveEntity}
      />
    </Stack>
  );
});

// ----------------------------------------------------------------------

/**
 * Summary preview showing counts by category (uses MAIN_CARDS)
 */
function EntitySummaryPreview({ linkedEntities, availableEntities, onOpenDialog }) {
  // Calculate counts per MAIN_CARD
  const cardCounts = MAIN_CARDS.map((card) => {
    const count = availableEntities.filter((entity) => {
      const entityCat = entity.category || entity.template || '';
      return card.categories.includes(entityCat) && linkedEntities.includes(entity.id);
    }).length;
    return { ...card, count };
  });

  const totalCount = linkedEntities.length;

  if (totalCount === 0) {
    return (
      <Box
        onClick={onOpenDialog}
        sx={{
          p: 4,
          borderRadius: 2,
          border: '2px dashed',
          borderColor: 'divider',
          bgcolor: 'background.neutral',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.lighter',
          },
        }}
      >
        <Iconify
          icon="solar:widget-add-bold-duotone"
          width={48}
          sx={{ color: 'text.disabled', mb: 2 }}
        />
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Nenhum conhecimento configurado
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Clique para adicionar produtos, informações, regras e mais
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      onClick={onOpenDialog}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1.5,
        }}
      >
        {cardCounts.map((card) => (
          <Box
            key={card.id}
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: card.count > 0 ? `${card.color}08` : 'grey.50',
              textAlign: 'center',
            }}
          >
            <Iconify
              icon={card.icon}
              width={24}
              sx={{
                color: card.count > 0 ? card.color : 'text.disabled',
                mb: 0.5,
              }}
            />
            <Typography
              variant="h6"
              sx={{
                color: card.count > 0 ? card.color : 'text.disabled',
                fontWeight: 700,
              }}
            >
              {card.count}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: card.count > 0 ? 'text.secondary' : 'text.disabled',
                display: 'block',
              }}
            >
              {card.title.split(' ')[0]}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}
      >
        {totalCount} {totalCount === 1 ? 'item configurado' : 'itens configurados'} • Clique para editar
      </Typography>
    </Box>
  );
}
