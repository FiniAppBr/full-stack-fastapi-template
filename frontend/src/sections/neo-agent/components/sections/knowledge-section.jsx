import { memo, useState, useMemo } from 'react';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { MAIN_CARDS } from 'src/sections/entities-v2/data/card-definitions';

import { useFormField, useFormActions } from '../agent-form-context';
import { KnowledgeModal } from '../knowledge-modal';
import { KnowledgePreview3D } from '../knowledge-preview-3d';

// ----------------------------------------------------------------------

/**
 * Knowledge section for neo-agent form.
 * Uses 3D preview + KnowledgeModal with category cards and auto-linking.
 */
export const KnowledgeSection = memo(({ availableEntities }) => {
  const linkedEntities = useFormField('linkedEntities');
  const { setField } = useFormActions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState(null);

  // Calculate counts per category for 3D preview
  const categoryCounts = useMemo(() => {
    const counts = { products: 0, business: 0, situations: 0, guardrails: 0 };

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
      <Typography variant="body2" color="text.secondary">
        O que seu agente deve saber?
      </Typography>

      {/* 3D Preview with integrated labels */}
      <KnowledgePreview3D
        counts={categoryCounts}
        onClick={handleOpenDialog}
        onSelectCategory={handleSelectCategory}
      />

      {/* Knowledge Modal */}
      <KnowledgeModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        linkedEntities={linkedEntities}
        availableEntities={availableEntities}
        onAddEntity={handleAddEntity}
        onRemoveEntity={handleRemoveEntity}
        initialCategory={initialCategory}
      />
    </Stack>
  );
});
