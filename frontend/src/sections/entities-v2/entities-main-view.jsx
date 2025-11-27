import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';

import { DashboardContent } from 'src/layouts/dashboard';

import { MainCardsView } from './views/main-cards-view';
import { EntityListView } from './views/entity-list-view';
import { EntityFormModal } from './components/entity-form-modal';
import { useEntityNavigation, NAV_LEVELS } from './hooks/use-entity-navigation';
import { useEntitiesByCategory } from './hooks/use-entities-by-category';
import { AnimatedView, AnimatedViewContainer } from './components/animated-view';

/**
 * Main view for the entity card system.
 * Simplified flow: Category Cards -> Entity List (no subcard layer)
 */
export function EntitiesMainView({
  compact = false,
  linkedEntityIds = null,
  onEntitiesChange,
}) {
  // Navigation state
  const {
    level,
    direction,
    currentCategory,
    selectCategory,
    goBack,
  } = useEntityNavigation();

  // Entity data
  const {
    totalCount,
    getCategoryCount,
    getCategoryEntities,
    mutate,
  } = useEntitiesByCategory({ linkedEntityIds });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  // Handlers
  const handleEdit = useCallback((entity) => {
    setEditingEntity(entity);
    setSelectedTemplate(null);
    setEditModalOpen(true);
  }, []);

  const handleAdd = useCallback((templateId = null) => {
    setEditingEntity(null);
    setSelectedTemplate(templateId);
    setEditModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (entity) => {
    // TODO: Implement delete with confirmation
    console.log('Delete entity:', entity);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditModalOpen(false);
    setEditingEntity(null);
    setSelectedTemplate(null);
  }, []);

  const handleSaveEntity = useCallback(async (entityData) => {
    setSaving(true);
    try {
      // TODO: Call API to save entity
      console.log('Save entity:', entityData);
      handleCloseModal();
      mutate();
    } finally {
      setSaving(false);
    }
  }, [handleCloseModal, mutate]);

  // Get current entities for list view
  const currentEntities = currentCategory
    ? getCategoryEntities(currentCategory.id)
    : [];

  // Render content based on navigation level
  const renderContent = () => {
    switch (level) {
      case NAV_LEVELS.LIST:
        return (
          <AnimatedView
            key={`list-${currentCategory?.id}`}
            direction={direction}
          >
            <EntityListView
              category={currentCategory}
              entities={currentEntities}
              onBack={goBack}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              compact={compact}
            />
          </AnimatedView>
        );

      default:
        return (
          <AnimatedView
            key="main"
            direction={direction}
          >
            <MainCardsView
              onSelectCard={selectCategory}
              getCount={getCategoryCount}
              totalCount={totalCount}
              compact={compact}
            />
          </AnimatedView>
        );
    }
  };

  const content = (
    <Box sx={{ minHeight: compact ? 400 : 'auto' }}>
      <AnimatedViewContainer>
        {renderContent()}
      </AnimatedViewContainer>

      {/* Edit/Create Modal */}
      <EntityFormModal
        open={editModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveEntity}
        entity={editingEntity}
        category={currentCategory}
        initialTemplate={selectedTemplate}
        loading={saving}
      />
    </Box>
  );

  // Wrap in DashboardContent for standalone page, or return raw for embedded
  if (compact) {
    return content;
  }

  return (
    <DashboardContent maxWidth="lg">
      {content}
    </DashboardContent>
  );
}
