import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import axios, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard';
import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';
import { LinkDialog } from 'src/components/link-dialog';

import {
  ChatPreview,
  useAgentForm,
  ActionsSection,
  ChannelsSection,
  AdvancedSection,
  IdentitySection,
  AccordionSection,
  KnowledgeSection,
  AgentFormProvider,
  GuardrailsSection,
  PersonalitySection,
} from './components';

// ----------------------------------------------------------------------

const SECTIONS = [
  { id: 'identity', label: 'Identidade', icon: 'solar:user-id-bold-duotone' },
  { id: 'personality', label: 'Personalidade', icon: 'solar:emoji-funny-circle-bold-duotone' },
  { id: 'knowledge', label: 'Conhecimento', icon: 'solar:book-2-bold-duotone' },
  { id: 'guardrails', label: 'Guardrails', icon: 'solar:shield-check-bold-duotone' },
  { id: 'actions', label: 'Ações', icon: 'solar:bolt-bold-duotone' },
  { id: 'channels', label: 'Canais', icon: 'solar:chat-round-dots-bold-duotone' },
  { id: 'advanced', label: 'Avançado', icon: 'solar:code-bold-duotone' },
];

// ----------------------------------------------------------------------

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
            isActive: agent.is_active,
            tone: agent.config?.personality?.tone || 'friendly',
            formality: agent.config?.personality?.formality || 'balanced',
            selectedTraits: agent.config?.personality?.traits || [],
            customInstructions: agent.config?.personality?.custom_instructions || '',
            emojiUsage: agent.config?.personality?.emoji_usage || 'minimal',
            responseStyle: agent.config?.personality?.response_style || 'whatsapp',
            language: agent.config?.personality?.language || 'pt',
            maxMessages: agent.config?.personality?.max_messages || 4,
            maxResponseLength: agent.config?.personality?.max_response_length || 300,
            linkedEntities: agent.linked_entities || [],
            avoidTopics: agent.config?.guardrails?.avoid_topics || [],
            escalationTriggers: agent.config?.guardrails?.escalation_triggers || [],
            customGuardrails: agent.config?.guardrails?.custom || '',
            enabledActions: agent.config?.actions || ['send_message', 'handoff_human'],
            enabledChannels: agent.channels || [],
            extractionModel: agent.config?.models?.extraction?.model || 'google/gemini-2.5-flash-lite',
            generationModel: agent.config?.models?.generation?.model || 'google/gemini-2.5-flash-lite',
            extractionTemp: agent.config?.models?.extraction?.temperature ?? 0.1,
            generationTemp: agent.config?.models?.generation?.temperature ?? 0.7,
            typingEnabled: agent.config?.typing?.enabled ?? true,
            typingBaseMs: agent.config?.typing?.base_ms ?? 800,
            typingPerCharMs: agent.config?.typing?.per_char_ms ?? 30,
            typingMaxDelayMs: agent.config?.typing?.max_delay_ms ?? 3000,
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
        navigate={navigate}
      />
    </AgentFormProvider>
  );
}

// ----------------------------------------------------------------------

function AgentFormContent({ agentId, isEdit, availableEntities, navigate }) {
  const form = useAgentForm();
  const [expandedSection, setExpandedSection] = useState('identity');
  const [entityPickerOpen, setEntityPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const templateInfo = agentSchemas.templates.find((t) => t.id === form.template) || agentSchemas.templates[7];

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      const payload = {
        name: form.name,
        description: form.description || null,
        template: form.template,
        is_active: form.isActive,
        channels: form.enabledChannels,
        linked_entities: form.linkedEntities,
        config: {
          personality: {
            tone: form.tone,
            formality: form.formality,
            traits: form.selectedTraits,
            custom_instructions: form.customInstructions || null,
            emoji_usage: form.emojiUsage,
            response_style: form.responseStyle,
            language: form.language,
            max_messages: form.maxMessages,
            max_response_length: form.maxResponseLength,
          },
          guardrails: {
            avoid_topics: form.avoidTopics,
            escalation_triggers: form.escalationTriggers,
            custom: form.customGuardrails || null,
          },
          actions: form.enabledActions,
          models: {
            extraction: {
              model: form.extractionModel,
              temperature: form.extractionTemp,
            },
            generation: {
              model: form.generationModel,
              temperature: form.generationTemp,
            },
          },
          typing: {
            enabled: form.typingEnabled,
            base_ms: form.typingBaseMs,
            per_char_ms: form.typingPerCharMs,
            max_delay_ms: form.typingMaxDelayMs,
            between_messages_ms: 500,
          },
        },
      };

      try {
        setSaving(true);
        if (isEdit) {
          await axios.patch(`/api/v1/neo-agents/${agentId}`, payload);
        } else {
          await axios.post('/api/v1/neo-agents', payload);
        }
        navigate(paths.dashboard.neoAgent.root);
      } catch (error) {
        console.error('Failed to save agent:', error);
        alert('Erro ao salvar agente');
      } finally {
        setSaving(false);
      }
    },
    [form, isEdit, agentId, navigate]
  );

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <IconButton component={RouterLink} href={paths.dashboard.neoAgent.root}>
          <Iconify icon="eva:chevron-left-fill" />
        </IconButton>
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: `${templateInfo.color}15`,
            color: templateInfo.color,
          }}
        >
          <Iconify icon={templateInfo.icon} width={24} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{form.name || (isEdit ? 'Editar Agente' : 'Novo Agente')}</Typography>
          <Chip
            size="small"
            label={templateInfo.name}
            sx={{
              mt: 0.5,
              bgcolor: `${templateInfo.color}15`,
              color: templateInfo.color,
              fontWeight: 600,
              height: 22,
            }}
          />
        </Box>
        <Box
          onClick={() => form.setField('isActive', !form.isActive)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.75,
            borderRadius: 3,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            bgcolor: form.isActive ? 'success.lighter' : 'grey.100',
            border: '1px solid',
            borderColor: form.isActive ? 'success.light' : 'grey.300',
            '&:hover': {
              bgcolor: form.isActive ? 'success.light' : 'grey.200',
            },
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: form.isActive ? 'success.main' : 'grey.400',
              transition: 'all 0.2s ease',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: form.isActive ? 'success.dark' : 'text.secondary',
              transition: 'all 0.2s ease',
            }}
          >
            {form.isActive ? 'Ativo' : 'Inativo'}
          </Typography>
        </Box>
      </Stack>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 4 }}>
          {/* Left Panel - Accordion Sections */}
          <Box sx={{ flex: 1, maxWidth: 640 }}>
            <AccordionSection
              id="identity"
              title="Identidade"
              expanded={expandedSection}
              onChange={setExpandedSection}
            >
              <IdentitySection />
            </AccordionSection>

            <AccordionSection
              id="personality"
              title="Personalidade"
              expanded={expandedSection}
              onChange={setExpandedSection}
            >
              <PersonalitySection />
            </AccordionSection>

            <AccordionSection
              id="knowledge"
              title="Conhecimento"
              expanded={expandedSection}
              onChange={setExpandedSection}
            >
              <KnowledgeSection
                availableEntities={availableEntities}
                onOpenPicker={() => setEntityPickerOpen(true)}
              />
            </AccordionSection>

            <AccordionSection
              id="guardrails"
              title="Guardrails"
              expanded={expandedSection}
              onChange={setExpandedSection}
            >
              <GuardrailsSection />
            </AccordionSection>

            <AccordionSection
              id="actions"
              title="Ações"
              expanded={expandedSection}
              onChange={setExpandedSection}
            >
              <ActionsSection />
            </AccordionSection>

            <AccordionSection
              id="channels"
              title="Canais"
              expanded={expandedSection}
              onChange={setExpandedSection}
            >
              <ChannelsSection />
            </AccordionSection>

            <AccordionSection
              id="advanced"
              title="Avançado"
              expanded={expandedSection}
              onChange={setExpandedSection}
            >
              <AdvancedSection />
            </AccordionSection>

            {/* Actions */}
            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button variant="outlined" onClick={() => navigate(paths.dashboard.neoAgent.root)}>
                Cancelar
              </Button>
              <Button variant="contained" type="submit" disabled={saving || !form.name}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Agente'}
              </Button>
            </Stack>
          </Box>

          {/* Right Panel - Chat Preview */}
          <Box
            sx={{
              position: 'sticky',
              top: 80,
              alignSelf: 'flex-start',
              height: 'calc(100vh - 180px)',
            }}
          >
            <ChatPreview agentId={agentId} />
          </Box>
        </Box>
      </form>

      {/* Entity Picker Dialog */}
      <LinkDialog
        open={entityPickerOpen}
        onClose={() => setEntityPickerOpen(false)}
        agentId={agentId || 0}
        currentLinks={form.linkedEntities}
        onSave={(selectedIds) => {
          form.setField('linkedEntities', selectedIds);
        }}
      />
    </DashboardContent>
  );
}
