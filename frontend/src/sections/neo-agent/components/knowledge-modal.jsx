import { useState, useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogContent from '@mui/material/DialogContent';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

import { MAIN_CARDS, getCardTemplates } from 'src/sections/entities-v2/data/card-definitions';
import { EntityFormModal } from 'src/sections/entities-v2/components/entity-form-modal';
import { RuleFormModal } from './rule-form-modal';
import { SituationFormModal } from './situation-form-modal';

// ----------------------------------------------------------------------

/**
 * Knowledge modal for agent - two-step UI:
 * 1. Show 4 category cards
 * 2. Click card -> filtered entity list + create
 */
export function KnowledgeModal({
  open,
  onClose,
  linkedEntities = [],
  availableEntities = [],
  onAddEntity,
  onRemoveEntity,
  onEntityCreated,
  onEntityUpdated,
  initialCategory = null,
  agentId = null,
}) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Reset to cards view or initial category when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCard(initialCategory);
      setShowLibrary(false);
    }
  }, [open, initialCategory]);

  // Get linked entities for current card
  const cardEntities = useMemo(() => {
    if (!selectedCard) return [];
    const card = MAIN_CARDS.find((c) => c.id === selectedCard);
    if (!card) return [];

    return availableEntities.filter((entity) => {
      const entityCat = entity.category || entity.template || '';
      return card.categories.includes(entityCat) && linkedEntities.includes(entity.id);
    });
  }, [selectedCard, availableEntities, linkedEntities]);

  // Get unlinked entities for current card (library)
  const libraryEntities = useMemo(() => {
    if (!selectedCard) return [];
    const card = MAIN_CARDS.find((c) => c.id === selectedCard);
    if (!card) return [];

    return availableEntities.filter((entity) => {
      const entityCat = entity.category || entity.template || '';
      return card.categories.includes(entityCat) && !linkedEntities.includes(entity.id);
    });
  }, [selectedCard, availableEntities, linkedEntities]);

  // Count linked entities per card
  const cardCounts = useMemo(() => {
    const counts = {};
    MAIN_CARDS.forEach((card) => {
      counts[card.id] = availableEntities.filter((entity) => {
        const entityCat = entity.category || entity.template || '';
        return card.categories.includes(entityCat) && linkedEntities.includes(entity.id);
      }).length;
    });
    return counts;
  }, [availableEntities, linkedEntities]);

  // Handle entity creation
  const handleCreateEntity = async (entityData) => {
    setSaving(true);
    try {
      const response = await axios.post(endpoints.entities.create, entityData);
      const newEntity = response.data;
      // Notify parent about new entity (for local state update)
      if (onEntityCreated) {
        onEntityCreated(newEntity);
      }
      // Auto-link the new entity (local state)
      onAddEntity(newEntity.id);
      // Persist link to backend if we have an agentId (editing existing agent)
      if (agentId) {
        const updatedLinked = [...linkedEntities, newEntity.id];
        await axios.patch(`/api/v1/neo-agents/${agentId}/linked-entities`, updatedLinked);
      }
      setCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create entity:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle entity update
  const handleUpdateEntity = async (entityData) => {
    setSaving(true);
    try {
      const response = await axios.patch(endpoints.entities.update(entityData.id), entityData);
      const updatedEntity = response.data;
      if (onEntityUpdated) {
        onEntityUpdated(updatedEntity);
      }
      setEditingEntity(null);
    } catch (error) {
      console.error('Failed to update entity:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(endpoints.entities.uploadDocument, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newEntity = response.data;
      if (onEntityCreated) {
        onEntityCreated(newEntity);
      }
      // Auto-link
      onAddEntity(newEntity.id);
      // Persist link if editing existing agent
      if (agentId) {
        const updatedLinked = [...linkedEntities, newEntity.id];
        await axios.patch(`/api/v1/neo-agents/${agentId}/linked-entities`, updatedLinked);
      }
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  // Check card type for custom modals
  const isGuardrailsCard = selectedCard === 'guardrails';
  const isSituationsCard = selectedCard === 'situations';
  const isDocumentsCard = selectedCard === 'documents';

  // Handle back to cards
  const handleBack = () => setSelectedCard(null);

  // Get current card info
  const currentCard = selectedCard ? MAIN_CARDS.find((c) => c.id === selectedCard) : null;
  const templates = selectedCard ? getCardTemplates(selectedCard) : [];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { minHeight: 400 } }}
      >
        <DialogContent sx={{ p: 0 }}>
          {/* Cards View */}
          {!selectedCard && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                O que seu agente deve saber?
              </Typography>

              <Stack spacing={2}>
                {MAIN_CARDS.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    count={cardCounts[card.id]}
                    onClick={() => setSelectedCard(card.id)}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Entity List View */}
          {selectedCard && currentCard && (
            <Box>
              {/* Header */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <IconButton onClick={handleBack} size="small">
                  <Iconify icon="eva:arrow-back-fill" />
                </IconButton>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${currentCard.color}15`,
                  }}
                >
                  <Iconify icon={currentCard.icon} width={24} sx={{ color: currentCard.color }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {currentCard.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {currentCard.subtitle}
                  </Typography>
                </Box>
                {isDocumentsCard ? (
                  <Button
                    variant="contained"
                    size="small"
                    component="label"
                    disabled={uploading}
                    startIcon={<Iconify icon={uploading ? 'eva:loader-outline' : 'eva:upload-fill'} />}
                    sx={{ bgcolor: currentCard.color, '&:hover': { bgcolor: currentCard.color } }}
                  >
                    {uploading ? 'Enviando...' : 'Upload'}
                    <input type="file" hidden accept=".txt,.pdf,.md,.doc,.docx" onChange={handleDocumentUpload} />
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Iconify icon="eva:plus-fill" />}
                    onClick={() => setCreateModalOpen(true)}
                    sx={{ bgcolor: currentCard.color, '&:hover': { bgcolor: currentCard.color } }}
                  >
                    Adicionar
                  </Button>
                )}
              </Stack>

              {/* Toggle: Linked vs Library */}
              <Box sx={{ px: 2, pt: 1 }}>
                <Tabs
                  value={showLibrary ? 1 : 0}
                  onChange={(_, v) => setShowLibrary(v === 1)}
                  sx={{
                    minHeight: 40,
                    '& .MuiTab-root': {
                      minHeight: 40,
                      py: 0,
                      px: 2,
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                    },
                  }}
                >
                  <Tab
                    label={`Ativos (${cardEntities.length})`}
                    icon={<Iconify icon="solar:check-circle-bold" width={16} />}
                    iconPosition="start"
                  />
                  <Tab
                    label={`Biblioteca (${libraryEntities.length})`}
                    icon={<Iconify icon="solar:library-bold" width={16} />}
                    iconPosition="start"
                  />
                </Tabs>
              </Box>

              {/* Entity List */}
              <Box sx={{ p: 2, minHeight: 300 }}>
                {!showLibrary ? (
                  // Linked entities
                  cardEntities.length === 0 ? (
                    <Box
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                      }}
                    >
                      <Iconify
                        icon={currentCard.icon}
                        width={48}
                        sx={{ color: 'text.disabled', mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Nenhum item vinculado
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Crie novo ou importe da biblioteca
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {cardEntities.map((entity) => (
                        <EntityItem
                          key={entity.id}
                          entity={entity}
                          color={currentCard.color}
                          onRemove={() => onRemoveEntity(entity.id)}
                          onEdit={() => setEditingEntity(entity)}
                        />
                      ))}
                    </Stack>
                  )
                ) : (
                  // Library entities (unlinked)
                  libraryEntities.length === 0 ? (
                    <Box
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                      }}
                    >
                      <Iconify
                        icon="solar:library-bold-duotone"
                        width={48}
                        sx={{ color: 'text.disabled', mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Biblioteca vazia
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Não há itens disponíveis para importar
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {libraryEntities.map((entity) => (
                        <EntityItem
                          key={entity.id}
                          entity={entity}
                          color={currentCard.color}
                          isLibrary
                          onAdd={() => onAddEntity(entity.id)}
                        />
                      ))}
                    </Stack>
                  )
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Entity Creation Modal - custom modals for guardrails and situations */}
      {isGuardrailsCard ? (
        <RuleFormModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSave={handleCreateEntity}
          loading={saving}
        />
      ) : isSituationsCard ? (
        <SituationFormModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSave={handleCreateEntity}
          loading={saving}
        />
      ) : (
        <EntityFormModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSave={handleCreateEntity}
          card={currentCard}
          templates={templates}
          loading={saving}
        />
      )}

      {/* Entity Edit Modal - custom modals for guardrails and situations */}
      {isGuardrailsCard ? (
        <RuleFormModal
          open={Boolean(editingEntity)}
          onClose={() => setEditingEntity(null)}
          onSave={handleUpdateEntity}
          entity={editingEntity}
          loading={saving}
        />
      ) : isSituationsCard ? (
        <SituationFormModal
          open={Boolean(editingEntity)}
          onClose={() => setEditingEntity(null)}
          onSave={handleUpdateEntity}
          entity={editingEntity}
          loading={saving}
        />
      ) : (
        <EntityFormModal
          open={Boolean(editingEntity)}
          onClose={() => setEditingEntity(null)}
          onSave={handleUpdateEntity}
          entity={editingEntity}
          card={currentCard}
          templates={templates}
          loading={saving}
        />
      )}
    </>
  );
}

// ----------------------------------------------------------------------

function CardItem({ card, count, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: card.color,
          bgcolor: `${card.color}08`,
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${card.color}15`,
        }}
      >
        <Iconify icon={card.icon} width={28} sx={{ color: card.color }} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {card.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {card.subtitle}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="h5" sx={{ color: count > 0 ? card.color : 'text.disabled' }}>
          {count}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {count === 1 ? 'item' : 'itens'}
        </Typography>
      </Box>
      <Iconify icon="eva:chevron-right-fill" width={20} sx={{ color: 'text.disabled' }} />
    </Box>
  );
}

// ----------------------------------------------------------------------

function EntityItem({ entity, color, isLibrary, onRemove, onAdd, onEdit }) {
  // Get style based on entity type
  const getEntityStyle = () => {
    // Guardrails - all red
    if (entity.category === 'guardrails') {
      const ruleColor = '#F44336';
      switch (entity.template) {
        case 'always_do':
          return { icon: 'solar:check-circle-bold', color: ruleColor };
        case 'never_do':
          return { icon: 'solar:forbidden-circle-bold', color: ruleColor };
        case 'never_say':
          return { icon: 'solar:chat-round-dots-bold', color: ruleColor };
        default:
          return { icon: 'solar:shield-warning-bold', color: ruleColor };
      }
    }
    // Situations - all orange
    if (['objections', 'opportunities', 'faq', 'specific_cases'].includes(entity.category)) {
      const situationColor = '#F97316';
      switch (entity.template) {
        case 'objection':
          return { icon: 'solar:shield-minimalistic-bold', color: situationColor };
        case 'specific_case':
          return { icon: 'solar:flag-bold', color: situationColor };
        case 'faq':
          return { icon: 'solar:question-circle-bold', color: situationColor };
        default:
          return { icon: 'solar:chat-round-dots-bold-duotone', color: situationColor };
      }
    }
    // Default
    return { icon: 'solar:document-text-bold-duotone', color };
  };

  const style = getEntityStyle();

  // Get subtitle based on entity type
  const getSubtitle = () => {
    // Guardrails - show trigger
    if (entity.category === 'guardrails') {
      const trigger = entity.data?.trigger;
      switch (trigger) {
        case 'first_turn':
          return 'Primeira msg';
        case 'when_relevant':
          return 'Quando relevante';
        default:
          return null;
      }
    }
    // Situations - show truncated response
    if (['objections', 'opportunities', 'faq', 'specific_cases'].includes(entity.category) && entity.data?.response) {
      const response = entity.data.response;
      return response.length > 50 ? `${response.substring(0, 50)}...` : response;
    }
    // Default - description
    return entity.description || null;
  };

  const subtitle = getSubtitle();

  return (
    <Box
      onClick={!isLibrary && onEdit ? onEdit : undefined}
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        borderRadius: 1.5,
        bgcolor: isLibrary ? 'background.paper' : 'background.neutral',
        border: '1px solid',
        borderColor: isLibrary ? 'divider' : 'transparent',
        cursor: !isLibrary && onEdit ? 'pointer' : 'default',
        transition: 'all 0.15s',
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: !isLibrary && onEdit ? style.color : 'transparent',
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${style.color}15`,
        }}
      >
        <Iconify icon={style.icon} width={20} sx={{ color: style.color }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500} noWrap>
          {entity.name}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        )}
      </Box>
      {isLibrary ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="eva:plus-fill" width={16} />}
          onClick={onAdd}
          sx={{ minWidth: 'auto', px: 1.5 }}
        >
          Adicionar
        </Button>
      ) : (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          sx={{ color: 'text.disabled' }}
        >
          <Iconify icon="eva:trash-2-outline" width={18} />
        </IconButton>
      )}
    </Box>
  );
}
