import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { DashboardContent } from 'src/layouts/dashboard';

import { MainCardsView } from './views/main-cards-view';
import { SubcardsView } from './views/subcards-view';
import { EntityListView } from './views/entity-list-view';
import { useEntityNavigation, NAV_LEVELS } from './hooks/use-entity-navigation';
import { useEntitiesByCategory } from './hooks/use-entities-by-category';
import { AnimatedView, AnimatedViewContainer } from './components/animated-view';

/**
 * Main orchestrating view for the entity card system.
 * Handles navigation between cards -> subcards -> entity list.
 *
 * @param {Object} props
 * @param {boolean} props.compact - Compact mode for embedded use
 * @param {number[]} props.linkedEntityIds - Filter to show only linked entities
 * @param {Function} props.onEntitiesChange - Callback when entities change (for embedded mode)
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
    currentMainCard,
    currentSubcard,
    selectMainCard,
    selectSubcard,
    goBack,
  } = useEntityNavigation();

  // Entity data
  const {
    getMainCardCount,
    getSubcardCount,
    getSubcardEntities,
    mutate,
  } = useEntitiesByCategory({ linkedEntityIds });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);

  // Handlers
  const handleEdit = useCallback((entity) => {
    setEditingEntity(entity);
    setEditModalOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingEntity(null);
    setEditModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (entity) => {
    // TODO: Implement delete with confirmation
    console.log('Delete entity:', entity);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditModalOpen(false);
    setEditingEntity(null);
  }, []);

  const handleSaveEntity = useCallback(async (entityData) => {
    // TODO: Implement save
    console.log('Save entity:', entityData);
    handleCloseModal();
    mutate();
  }, [handleCloseModal, mutate]);

  // Get current entities for list view
  const currentEntities = currentMainCard && currentSubcard
    ? getSubcardEntities(currentMainCard.id, currentSubcard.id)
    : [];

  // Render content based on navigation level
  const renderContent = () => {
    switch (level) {
      case NAV_LEVELS.SUBCARDS:
        return (
          <AnimatedView
            key={`subcards-${currentMainCard?.id}`}
            direction={direction}
          >
            <SubcardsView
              mainCard={currentMainCard}
              onSelectSubcard={selectSubcard}
              onBack={goBack}
              getCount={(mainId, subId) => getSubcardCount(mainId, subId)}
              compact={compact}
            />
          </AnimatedView>
        );

      case NAV_LEVELS.LIST:
        return (
          <AnimatedView
            key={`list-${currentSubcard?.id}`}
            direction={direction}
          >
            <EntityListView
              mainCard={currentMainCard}
              subcard={currentSubcard}
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
              onSelectCard={selectMainCard}
              getCount={getMainCardCount}
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

      {/* Edit/Create Modal - TODO: Implement EntityFormModal */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingEntity ? 'Editar' : 'Novo Item'}
        </DialogTitle>
        <DialogContent>
          {/* TODO: EntityFormModal component */}
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            Formulario em desenvolvimento
          </Box>
        </DialogContent>
      </Dialog>
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
