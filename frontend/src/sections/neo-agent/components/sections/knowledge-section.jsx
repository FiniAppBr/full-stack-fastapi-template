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

      {/* 3D Preview - 4 category cards */}
      <KnowledgePreview3D
        counts={categoryCounts}
        onSelectCategory={handleSelectCategory}
      />

      {/* Documents button - centered, matching card style */}
      <Box
        onClick={() => handleSelectCategory('documents')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          py: 1.5,
          px: 2,
          mx: 'auto',
          borderRadius: 2,
          cursor: 'pointer',
          bgcolor: categoryCounts.documents > 0 ? '#00A76F15' : 'background.neutral',
          border: '1px solid',
          borderColor: categoryCounts.documents > 0 ? '#00A76F30' : 'divider',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: categoryCounts.documents > 0 ? '#00A76F25' : 'action.hover',
            transform: 'scale(1.02)',
            borderColor: '#00A76F',
          },
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: categoryCounts.documents > 0 ? '#00A76F25' : 'action.hover',
          }}
        >
          <Iconify
            icon="solar:document-bold-duotone"
            width={20}
            sx={{ color: categoryCounts.documents > 0 ? '#00A76F' : 'text.disabled' }}
          />
        </Box>
        <Typography
          variant="h5"
          sx={{
            color: categoryCounts.documents > 0 ? '#00A76F' : 'text.disabled',
            fontWeight: 700,
          }}
        >
          {categoryCounts.documents}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: categoryCounts.documents > 0 ? 'text.primary' : 'text.disabled',
            fontWeight: 600,
          }}
        >
          Documentos & PDFs
        </Typography>
      </Box>

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
