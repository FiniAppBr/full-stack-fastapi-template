import { memo, useState, useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { MAIN_CARDS } from 'src/sections/entities-v2/data/card-definitions';

import { useFormField, useFormActions } from '../agent-form-context';
import { KnowledgeModal } from '../knowledge-modal';
import { KnowledgePreview3D } from '../knowledge-preview-3d';

// ----------------------------------------------------------------------

/**
 * Knowledge section for neo-agent form.
 * Uses 3D preview + KnowledgeModal with category cards and auto-linking.
 */
export const KnowledgeSection = memo(({ availableEntities, onEntityCreated, agentId }) => {
  const linkedEntities = useFormField('linkedEntities');
  const { setField } = useFormActions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState(null);

  // Get documents card definition
  const documentsCard = MAIN_CARDS.find((c) => c.id === 'documents');

  // Calculate counts per category for 3D preview
  const categoryCounts = useMemo(() => {
    const counts = { products: 0, business: 0, situations: 0, guardrails: 0, documents: 0 };

    MAIN_CARDS.forEach((card) => {
      const count = availableEntities.filter((entity) => {
        const entityCat = entity.category || entity.template || '';
        return card.categories.includes(entityCat) && linkedEntities.includes(entity.id);
      }).length;
      counts[card.id] = count;
    });

    return counts;
  }, [availableEntities, linkedEntities]);

  const handleOpenDialog = () => {
    setInitialCategory(null);
    setDialogOpen(true);
  };

  const handleSelectCategory = (categoryId) => {
    setInitialCategory(categoryId);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setInitialCategory(null);
  };

  const handleAddEntity = (entityId) => {
    if (!linkedEntities.includes(entityId)) {
      setField('linkedEntities', [...linkedEntities, entityId]);
    }
  };

  const handleRemoveEntity = (entityId) => {
    setField('linkedEntities', linkedEntities.filter((id) => id !== entityId));
  };

  return (
    <Stack spacing={1.5}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          O que seu agente deve saber?
        </Typography>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<Iconify icon="eva:plus-fill" width={16} />}
          onClick={handleOpenDialog}
          sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover', borderColor: 'text.disabled' },
          }}
        >
          Adicionar
        </Button>
      </Stack>

      {/* 3D Preview with integrated labels */}
      <KnowledgePreview3D
        counts={categoryCounts}
        onClick={handleOpenDialog}
        onSelectCategory={handleSelectCategory}
      />

      {/* Documents Card - compact clickable card */}
      {documentsCard && (
        <Box
          onClick={() => handleSelectCategory('documents')}
          sx={{
            p: 1.5,
            borderRadius: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'background.neutral',
            border: '1px solid',
            borderColor: 'divider',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: documentsCard.color,
            },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${documentsCard.color}20`,
              }}
            >
              <Iconify icon={documentsCard.icon} width={18} sx={{ color: documentsCard.color }} />
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600}>
                {documentsCard.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                {documentsCard.subtitle}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            {categoryCounts.documents > 0 && (
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 0.5,
                  bgcolor: documentsCard.color,
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              >
                {categoryCounts.documents}
              </Box>
            )}
            <Iconify icon="eva:chevron-right-fill" width={18} sx={{ color: 'text.disabled' }} />
          </Stack>
        </Box>
      )}

      {/* Knowledge Modal */}
      <KnowledgeModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        linkedEntities={linkedEntities}
        availableEntities={availableEntities}
        onAddEntity={handleAddEntity}
        onRemoveEntity={handleRemoveEntity}
        onEntityCreated={onEntityCreated}
        initialCategory={initialCategory}
        agentId={agentId}
      />
    </Stack>
  );
});
