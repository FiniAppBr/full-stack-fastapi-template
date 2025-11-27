import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';

import { DashboardContent } from 'src/layouts/dashboard';

import { getCardTemplates } from './data/card-definitions';
import { MainCardsView } from './views/main-cards-view';
import { EntityListView } from './views/entity-list-view';
import { DocumentsView } from './views/documents-view';
import { EntityFormModal } from './components/entity-form-modal';
import { useEntityNavigation, NAV_LEVELS } from './hooks/use-entity-navigation';
import { useEntitiesByCategory } from './hooks/use-entities-by-category';
import { AnimatedView, AnimatedViewContainer } from './components/animated-view';

/**
 * Main view for entities - 6 cards, simple flow.
 */
export function EntitiesMainView({
  compact = false,
  linkedEntityIds = null,
  onEntitiesChange,
}) {
  // Navigation
  const {
    level,
    direction,
    currentCard,
    selectCard,
    goBack,
  } = useEntityNavigation();

  // Entity data
  const {
    totalCount,
    getCardCount,
    getCardEntities,
    mutate,
  } = useEntitiesByCategory({ linkedEntityIds });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  // Handlers
  const handleEdit = useCallback((entity) => {
    setEditingEntity(entity);
    setSelectedTemplate(null);
    setModalOpen(true);
  }, []);

  const handleAdd = useCallback((templateId = null) => {
    setEditingEntity(null);
    setSelectedTemplate(templateId);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (entity) => {
    // TODO: Implement delete
    console.log('Delete:', entity);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingEntity(null);
    setSelectedTemplate(null);
  }, []);

  const handleSave = useCallback(async (data) => {
    setSaving(true);
    try {
      // TODO: Call API
      console.log('Save:', data);
      handleCloseModal();
      mutate();
      onEntitiesChange?.();
    } finally {
      setSaving(false);
    }
  }, [handleCloseModal, mutate, onEntitiesChange]);

  // Get templates and entities for current card
  const templates = currentCard ? getCardTemplates(currentCard.id) : [];
  const entities = currentCard ? getCardEntities(currentCard.id) : [];

  const renderContent = () => {
    if (level === NAV_LEVELS.LIST && currentCard) {
      return (
        <AnimatedView key={`list-${currentCard.id}`} direction={direction}>
          <EntityListView
            card={currentCard}
            templates={templates}
            entities={entities}
            onBack={goBack}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAdd={handleAdd}
            compact={compact}
          />
        </AnimatedView>
      );
    }

    return (
      <AnimatedView key="main" direction={direction}>
        <MainCardsView
          onSelectCard={selectCard}
          getCount={getCardCount}
          totalCount={totalCount}
          compact={compact}
        />
      </AnimatedView>
    );
  };

  const content = (
    <Box sx={{ minHeight: compact ? 400 : 'auto' }}>
      <AnimatedViewContainer>
        {renderContent()}
      </AnimatedViewContainer>

      <EntityFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        entity={editingEntity}
        card={currentCard}
        templates={templates}
        initialTemplate={selectedTemplate}
        loading={saving}
      />
    </Box>
  );

  if (compact) return content;

  return (
    <DashboardContent maxWidth="lg">
      {content}
    </DashboardContent>
  );
}
