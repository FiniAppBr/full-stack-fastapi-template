import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { getCardTemplates } from './data/card-definitions';
import { MainCardsView } from './views/main-cards-view';
import { EntityListView } from './views/entity-list-view';
import { EntityFormModal } from './components/entity-form-modal';
import { DocumentsUpload } from './components/documents-upload';
import { useEntityNavigation, NAV_LEVELS } from './hooks/use-entity-navigation';
import { useEntitiesByCategory } from './hooks/use-entities-by-category';
import { AnimatedView, AnimatedViewContainer } from './components/animated-view';

/**
 * Main view for entities - tabs at top: Entidades | Documentos
 */
export function EntitiesMainView({
  compact = false,
  linkedEntityIds = null,
  onEntitiesChange,
}) {
  // Top-level tab
  const [mainTab, setMainTab] = useState(0);

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
      console.log('Save:', data);
      handleCloseModal();
      mutate();
      onEntitiesChange?.();
    } finally {
      setSaving(false);
    }
  }, [handleCloseModal, mutate, onEntitiesChange]);

  const templates = currentCard ? getCardTemplates(currentCard.id) : [];
  const entities = currentCard ? getCardEntities(currentCard.id) : [];

  const renderEntitiesContent = () => {
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
          onEditEntity={handleEdit}
          getCount={getCardCount}
          totalCount={totalCount}
          compact={compact}
        />
      </AnimatedView>
    );
  };

  const content = (
    <Box sx={{ minHeight: compact ? 400 : 'auto' }}>
      {/* Top-level tabs */}
      <Tabs
        value={mainTab}
        onChange={(_, v) => setMainTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          label="Entidades"
          icon={<Iconify icon="solar:widget-bold" width={20} />}
          iconPosition="start"
        />
        <Tab
          label="Documentos"
          icon={<Iconify icon="solar:file-text-bold" width={20} />}
          iconPosition="start"
        />
      </Tabs>

      {/* Tab content */}
      {mainTab === 0 && (
        <AnimatedViewContainer>
          {renderEntitiesContent()}
        </AnimatedViewContainer>
      )}

      {mainTab === 1 && (
        <DocumentsUpload color="#7635DC" />
      )}

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
