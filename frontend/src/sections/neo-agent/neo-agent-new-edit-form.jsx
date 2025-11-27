import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { varAlpha } from 'src/theme/styles';

import axios, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard';
import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import {
  ChatPreview,
  useFormField,
  useFormState,
  ActionsSection,
  useFormActions,
  ChannelsSection,
  IdentitySection,
  ContactPreview,
  AccordionSection,
  KnowledgeSection,
  AgentFormProvider,
  PersonalitySection,
  DataCollectionSection,
} from './components';
import { ConnectingLines } from './components/connecting-lines';

// ----------------------------------------------------------------------

// Accordion sections config - add/remove/reorder here
const SECTIONS = [
  { id: 'identity', title: 'Identidade', Component: IdentitySection },
  { id: 'format', title: 'Estilo de Mensagens', Component: PersonalitySection },
  { id: 'knowledge', title: 'Conhecimento', Component: KnowledgeSection, props: ['availableEntities', 'onEntityCreated'] },
  { id: 'data-collection', title: 'Coleta de Dados', Component: DataCollectionSection },
  // guardrails removed - now an entity type
  { id: 'actions', title: 'Ações', Component: ActionsSection },
  { id: 'channels', title: 'Canais', Component: ChannelsSection },
];

export function NeoAgentNewEditForm({ agentId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!agentId;

  const urlTemplate = searchParams.get('template');

  const [loading, setLoading] = useState(isEdit);
  const [initialData, setInitialData] = useState(null);
  const [availableEntities, setAvailableEntities] = useState([]);

  // Fetch agent data if editing
  useEffect(() => {
    if (isEdit) {
      const fetchAgent = async () => {
        try {
          const response = await axios.get(`/api/v1/neo-agents/${agentId}`);
          const agent = response.data;

          setInitialData({
            name: agent.name,
            description: agent.description || '',
            template: agent.template,
            customIcon: agent.custom_icon || '',
            customColor: agent.custom_color || '',
            customTag: agent.custom_tag || '',
            isActive: agent.is_active,
            language: agent.config?.personality?.language || 'pt',
            minMessages: agent.config?.personality?.min_messages || 1,
            maxMessages: agent.config?.personality?.max_messages || 4,
            maxResponseLength: agent.config?.personality?.max_response_length || 200,
            emojiUsage: agent.config?.personality?.emoji_usage || 'disabled',
            linkedEntities: agent.linked_entities || [],
            avoidTopics: agent.config?.guardrails?.avoid_topics || [],
            escalationTriggers: agent.config?.guardrails?.escalation_triggers || [],
            customGuardrails: agent.config?.guardrails?.custom || '',
            enabledToolCategories: agent.config?.enabled_tool_categories || [],
            enabledChannels: agent.channels || [],
            extractionModel: agent.config?.models?.extraction?.model || 'google/gemini-2.5-flash-lite',
            generationModel: agent.config?.models?.generation?.model || 'google/gemini-2.5-flash-lite',
            extractionTemp: agent.config?.models?.extraction?.temperature ?? 0.1,
            generationTemp: agent.config?.models?.generation?.temperature ?? 0.7,
            typingEnabled: agent.config?.typing?.enabled ?? true,
            typingBaseMs: agent.config?.typing?.base_ms ?? 800,
            typingPerCharMs: agent.config?.typing?.per_char_ms ?? 30,
            typingMaxDelayMs: agent.config?.typing?.max_delay_ms ?? 3000,
            fieldConfigs: (agent.config?.data_collection?.fields || []).map((f) => ({
              fieldId: f.field_id,
              necessity: f.necessity,
              collectionHint: f.collection_hint || '',
            })),
          });
        } catch (error) {
          console.error('Failed to fetch agent:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchAgent();
    } else if (urlTemplate) {
      const templateInfo = agentSchemas.templates.find((t) => t.id === urlTemplate);
      if (templateInfo?.defaultConfig) {
        const config = templateInfo.defaultConfig;
        setInitialData({
          template: urlTemplate,
          tone: config.personality?.tone || 'friendly',
          formality: config.personality?.formality || 'balanced',
          selectedTraits: config.personality?.traits || [],
          emojiUsage: config.personality?.emojiUsage || 'minimal',
          responseStyle: config.personality?.responseStyle || 'whatsapp',
          language: config.personality?.language || 'pt',
          maxMessages: config.personality?.maxMessages || 4,
          maxResponseLength: config.personality?.maxResponseLength || 300,
          avoidTopics: config.guardrails?.avoidTopics || [],
          escalationTriggers: config.guardrails?.escalationTriggers || [],
        });
      }
    }
  }, [isEdit, agentId, urlTemplate]);

  // Fetch entities
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await axios.get(endpoints.entities.list);
        setAvailableEntities(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch entities:', error);
      }
    };
    fetchEntities();
  }, []);

  // Handle new entity created (add to local list)
  const handleEntityCreated = useCallback((newEntity) => {
    setAvailableEntities((prev) => [...prev, newEntity]);
  }, []);

  if (loading) {
    return (
      <DashboardContent>
        <Typography>Carregando...</Typography>
      </DashboardContent>
    );
  }

  return (
    <AgentFormProvider initialData={initialData}>
      <AgentFormContent
        agentId={agentId}
        isEdit={isEdit}
        availableEntities={availableEntities}
        onEntityCreated={handleEntityCreated}
        navigate={navigate}
      />
    </AgentFormProvider>
  );
}

// ----------------------------------------------------------------------

function AgentFormContent({ agentId, isEdit, availableEntities, onEntityCreated, navigate }) {
  const theme = useTheme();
  const [expandedSection, setExpandedSection] = useState('identity');
  const [saving, setSaving] = useState(false);
  const [collectedData, setCollectedData] = useState({});

  // Refs for connecting lines
  const containerRef = useRef(null);
  const agentCardRef = useRef(null);
  const accordionRefs = useRef([]);

  // Granular subscriptions - only re-render when these specific fields change
  const name = useFormField('name');
  const template = useFormField('template');
  const isActive = useFormField('isActive');
  const isDirty = useFormField('isDirty');
  const linkedEntities = useFormField('linkedEntities');
  const customIcon = useFormField('customIcon');
  const customColor = useFormField('customColor');
  const customTag = useFormField('customTag');
  const fieldConfigs = useFormField('fieldConfigs');

  // Actions never change, no re-renders
  const { setField, markClean, setSaveCallback, cancelPendingSave, getState } = useFormActions();

  const templateInfo = agentSchemas.templates.find((t) => t.id === template) || agentSchemas.templates[7];

  // Effective values for header display
  const effectiveIcon = customIcon || templateInfo.icon;
  const effectiveColor = customColor || templateInfo.color;
  const effectiveTag = customTag || templateInfo.name;


  // Save function - reads fresh state via getState() to avoid stale closures
  const handleSave = useCallback(async () => {
    const state = getState();
    if (!state.name || saving) return;

    const payload = {
      name: state.name,
      description: state.description || null,
      template: state.template,
      custom_icon: state.customIcon || null,
      custom_color: state.customColor || null,
      custom_tag: state.customTag || null,
      is_active: state.isActive,
      channels: state.enabledChannels,
      linked_entities: state.linkedEntities,
      config: {
        personality: {
          language: state.language,
          min_messages: state.minMessages,
          max_messages: state.maxMessages,
          max_response_length: state.maxResponseLength,
        },
        guardrails: {
          avoid_topics: state.avoidTopics,
          escalation_triggers: state.escalationTriggers,
          custom: state.customGuardrails || null,
        },
        enabled_tool_categories: state.enabledToolCategories,
        models: {
          extraction: {
            model: state.extractionModel,
            temperature: state.extractionTemp,
          },
          generation: {
            model: state.generationModel,
            temperature: state.generationTemp,
          },
        },
        typing: {
          enabled: state.typingEnabled,
          base_ms: state.typingBaseMs,
          per_char_ms: state.typingPerCharMs,
          max_delay_ms: state.typingMaxDelayMs,
          between_messages_ms: 500,
        },
        data_collection: {
          fields: state.fieldConfigs.map((fc) => ({
            field_id: fc.fieldId,
            necessity: fc.necessity,
            collection_hint: fc.collectionHint || null,
          })),
        },
      },
    };

    try {
      setSaving(true);
      if (isEdit) {
        await axios.patch(`/api/v1/neo-agents/${agentId}`, payload);
        markClean();
      } else {
        const response = await axios.post('/api/v1/neo-agents', payload);
        navigate(paths.dashboard.neoAgent.edit(response.data.id));
      }
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setSaving(false);
    }
  }, [getState, isEdit, agentId, navigate, markClean, saving]);

  // Register autosave callback once (only for edit mode)
  useEffect(() => {
    if (isEdit) {
      setSaveCallback(handleSave);
    }
    return () => cancelPendingSave();
  }, [isEdit, handleSave, setSaveCallback, cancelPendingSave]);

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSave();
  };

  return (
    <DashboardContent maxWidth="xl">
      {/* Header - sticky with glass effect */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          py: 2,
          mx: -3,
          px: 3,
          mb: 2,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: varAlpha(theme.vars.palette.background.defaultChannel, 0.8),
        }}
      >
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, maxWidth: 640 }}>
          <IconButton
            component={RouterLink}
            href={paths.dashboard.neoAgent.root}
            disabled={saving || isDirty}
          >
            <Iconify icon="eva:chevron-left-fill" />
          </IconButton>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: `${effectiveColor}15`,
              color: effectiveColor,
            }}
          >
            <Iconify icon={effectiveIcon} width={24} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5">{name || (isEdit ? 'Editar Agente' : 'Novo Agente')}</Typography>
            <Chip
              size="small"
              label={effectiveTag}
              sx={{
                mt: 0.5,
                bgcolor: `${effectiveColor}15`,
                color: effectiveColor,
                fontWeight: 600,
                height: 22,
              }}
            />
          </Box>
          {/* Save status + Active toggle */}
          {isEdit ? (
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography
                variant="body2"
                sx={{
                  color: saving || isDirty ? 'text.secondary' : 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: saving || isDirty ? 'text.disabled' : 'success.main',
                  }}
                />
                {saving || isDirty ? 'Salvando...' : 'Salvo'}
              </Typography>
              <Box
                onClick={() => setField('isActive', !isActive)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  bgcolor: isActive ? 'success.lighter' : 'grey.100',
                  border: '1px solid',
                  borderColor: isActive ? 'success.light' : 'grey.300',
                  '&:hover': {
                    bgcolor: isActive ? 'success.light' : 'grey.200',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: isActive ? 'success.main' : 'grey.400',
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    color: isActive ? 'success.dark' : 'text.secondary',
                  }}
                >
                  {isActive ? 'Ativo' : 'Inativo'}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Button
              variant="contained"
              size="small"
              type="submit"
              disabled={saving || !name}
            >
              {saving ? 'Criando...' : 'Criar Agente'}
            </Button>
          )}
          </Stack>
        </Box>
      </Box>

      {/* Main content: form left, agent card right */}
      <Box ref={containerRef} sx={{ display: 'flex', gap: 4, position: 'relative' }}>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: '0 0 640px', maxWidth: 640 }}>
          {SECTIONS.map((section, index) => {
            const { id, title, Component, props: propKeys } = section;
            // Build props dynamically for sections that need them
            const componentProps = {};
            if (propKeys?.includes('availableEntities')) componentProps.availableEntities = availableEntities;
            if (propKeys?.includes('onEntityCreated')) componentProps.onEntityCreated = onEntityCreated;

            return (
              <div key={id} ref={(el) => { accordionRefs.current[index] = el; }}>
                <AccordionSection
                  id={id}
                  title={title}
                  expanded={expandedSection}
                  onChange={setExpandedSection}
                >
                  <Component {...componentProps} />
                </AccordionSection>
              </div>
            );
          })}
        </form>

        {/* Agent Card - fixed position */}
        <Box
          ref={agentCardRef}
          sx={{
            position: 'fixed',
            top: '50%',
            right: '16.67vw',
            transform: 'translateY(-50%)',
            p: 2.5,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            minWidth: 200,
            textAlign: 'center',
            zIndex: 0,
          }}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: `${effectiveColor}15`,
              color: effectiveColor,
              mx: 'auto',
              mb: 1.5,
            }}
          >
            <Iconify icon={effectiveIcon} width={28} />
          </Avatar>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
            {name || 'Novo Agente'}
          </Typography>
          <Chip
            size="small"
            label={effectiveTag}
            sx={{
              bgcolor: `${effectiveColor}15`,
              color: effectiveColor,
              fontWeight: 600,
              height: 22,
            }}
          />
        </Box>

        {/* Connecting Lines */}
        <ConnectingLines
          containerRef={containerRef}
          sourceRefs={accordionRefs}
          targetRef={agentCardRef}
          dependency={expandedSection}
          activeIndex={expandedSection ? SECTIONS.findIndex((s) => s.id === expandedSection) : null}
          activeColor={effectiveColor}
        />
      </Box>
    </DashboardContent>
  );
}
