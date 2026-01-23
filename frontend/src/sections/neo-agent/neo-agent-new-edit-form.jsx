import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import axios, { endpoints } from 'src/utils/axios';

import { varAlpha } from 'src/theme/styles';
import { DashboardContent } from 'src/layouts/dashboard';
import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { ConnectingLines } from './components/connecting-lines';
import {
  ChatPreview,
  useFormField,
  ActionsSection,
  useFormActions,
  ContactPreview,
  ChannelsSection,
  IdentitySection,
  AccordionSection,
  KnowledgeSection,
  AgentFormProvider,
  PersonalitySection,
  DataCollectionSection,
} from './components';

// ----------------------------------------------------------------------

// Accordion sections config - add/remove/reorder here
const SECTIONS = [
  { id: 'identity', title: 'Identidade', Component: IdentitySection },
  { id: 'format', title: 'Estilo de Mensagens', Component: PersonalitySection },
  { id: 'knowledge', title: 'Conhecimento', Component: KnowledgeSection, props: ['availableEntities', 'onEntityCreated', 'onEntityUpdated', 'agentId'] },
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

  // Handle entity updated (update in local list)
  const handleEntityUpdated = useCallback((updatedEntity) => {
    setAvailableEntities((prev) =>
      prev.map((e) => (e.id === updatedEntity.id ? updatedEntity : e))
    );
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
        onEntityUpdated={handleEntityUpdated}
        navigate={navigate}
      />
    </AgentFormProvider>
  );
}

// ----------------------------------------------------------------------

function AgentFormContent({ agentId, isEdit, availableEntities, onEntityCreated, onEntityUpdated, navigate }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedSection, setExpandedSection] = useState('identity');
  const [saving, setSaving] = useState(false);
  const [collectedData, setCollectedData] = useState({});
  const [testMode, setTestMode] = useState(false);

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
    <DashboardContent maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
      {/* Header - sticky with glass effect */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          py: { xs: 1.5, sm: 2 },
          mx: { xs: -2, sm: -3 },
          px: { xs: 2, sm: 3 },
          mb: { xs: 1.5, sm: 2 },
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: varAlpha(theme.vars.palette.background.defaultChannel, 0.8),
        }}
      >
        <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2, md: 4 }, alignItems: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 1.5, md: 2 }} sx={{ flex: 1, maxWidth: { xs: '100%', md: 640 } }}>
          <IconButton
            component={RouterLink}
            href={paths.dashboard.neoAgent.root}
            disabled={saving}
          >
            <Iconify icon="eva:chevron-left-fill" />
          </IconButton>
          <Avatar
            sx={{
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
              bgcolor: `${effectiveColor}15`,
              color: effectiveColor,
              flexShrink: 0,
            }}
          >
            <Iconify icon={effectiveIcon} width={24} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontSize: { xs: '1rem', sm: '1.25rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name || (isEdit ? 'Editar Agente' : 'Novo Agente')}
            </Typography>
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
            <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ flexShrink: 0 }}>
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
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {saving || isDirty ? 'Salvando...' : 'Salvo'}
                </Box>
              </Typography>
              <Box
                onClick={() => setField('isActive', !isActive)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: { xs: 1, sm: 1.5 },
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
                    display: { xs: 'none', sm: 'block' },
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
              onClick={handleSave}
              disabled={saving || !name}
            >
              {saving ? 'Criando...' : 'Criar Agente'}
            </Button>
          )}
          </Stack>

        </Box>
      </Box>

      {/* Test Mode Button - fixed top right */}
      <Button
        variant={testMode ? 'outlined' : 'contained'}
        color={testMode ? 'inherit' : 'primary'}
        startIcon={<Iconify icon={testMode ? 'solar:document-text-bold' : 'solar:chat-round-dots-bold'} width={22} />}
        onClick={() => setTestMode(!testMode)}
        sx={{
          position: 'fixed',
          top: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 24 },
          px: { xs: 2, sm: 3 },
          py: { xs: 1, sm: 1.5 },
          borderRadius: 2,
          fontWeight: 600,
          fontSize: { xs: '0.8rem', sm: '0.95rem' },
          whiteSpace: 'nowrap',
          zIndex: 20,
          boxShadow: testMode ? 'none' : '0 4px 12px rgba(0,0,0,0.15)',
          // Hide text on very small screens, show only icon
          '& .MuiButton-startIcon': {
            mr: { xs: 0, sm: 1 },
          },
        }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {testMode ? 'Resumo do Agente' : 'Testar Agente'}
        </Box>
      </Button>

      {/* Main content: form left, agent card right */}
      <Box ref={containerRef} sx={{ display: 'flex', gap: { xs: 2, md: 4 }, position: 'relative' }}>
        {/* Form */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            flex: { xs: 1, md: '0 0 640px' },
            maxWidth: { xs: '100%', md: 640 },
            width: '100%',
          }}
        >
          {SECTIONS.map((section, index) => {
            const { id, title, Component, props: propKeys } = section;
            // Build props dynamically for sections that need them
            const componentProps = {};
            if (propKeys?.includes('availableEntities')) componentProps.availableEntities = availableEntities;
            if (propKeys?.includes('onEntityCreated')) componentProps.onEntityCreated = onEntityCreated;
            if (propKeys?.includes('onEntityUpdated')) componentProps.onEntityUpdated = onEntityUpdated;
            if (propKeys?.includes('agentId')) componentProps.agentId = agentId;

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
        </Box>

        {/* Agent Card - fixed position (hidden in test mode and on mobile/tablet) */}
        <Box
          ref={agentCardRef}
          sx={{
            position: 'fixed',
            top: '50%',
            right: { md: '10vw', lg: '16.67vw' },
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
            opacity: testMode ? 0 : 1,
            visibility: testMode ? 'hidden' : 'visible',
            transition: 'opacity 0.3s ease, visibility 0.3s ease',
            // Hide on mobile/tablet - header already shows agent info
            display: { xs: 'none', lg: 'block' },
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

        {/* Connecting Lines (hidden in test mode and on mobile) */}
        <Box
          sx={{
            opacity: testMode ? 0 : 1,
            visibility: testMode ? 'hidden' : 'visible',
            transition: 'opacity 0.3s ease, visibility 0.3s ease',
            // Hide on mobile/tablet - follows agent card visibility
            display: { xs: 'none', lg: 'block' },
          }}
        >
          <ConnectingLines
            containerRef={containerRef}
            sourceRefs={accordionRefs}
            targetRef={agentCardRef}
            dependency={expandedSection}
            activeIndex={expandedSection ? SECTIONS.findIndex((s) => s.id === expandedSection) : null}
            activeColor={effectiveColor}
          />
        </Box>

        {/* Test Mode: Chat + Contact Preview */}
        <Box
          sx={{
            flex: 1,
            display: testMode ? 'flex' : 'none',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 1.5, sm: 2 },
            ml: { xs: 0, md: 2, lg: 4 },
            opacity: testMode ? 1 : 0,
            visibility: testMode ? 'visible' : 'hidden',
            transform: testMode ? 'translateX(0)' : 'translateX(20px)',
            transition: 'opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease',
            pointerEvents: testMode ? 'auto' : 'none',
          }}
        >
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: { xs: 350, sm: 400, md: 500 } }}>
            <ChatPreview agentId={agentId} isDirty={isDirty} onCollectedDataChange={setCollectedData} />
          </Box>
          <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
            <ContactPreview collectedData={collectedData} />
          </Box>
        </Box>
      </Box>
    </DashboardContent>
  );
}
