import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import Slider from '@mui/material/Slider';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import axios, { endpoints } from 'src/utils/axios';

import agentSchemas from 'src/assets/data/agent-schemas.json';
import entitySchemas from 'src/assets/data/entity-schemas.json';

// ----------------------------------------------------------------------

const SECTIONS = [
  { id: 'identity', label: 'Identidade', icon: 'solar:user-id-bold-duotone' },
  { id: 'personality', label: 'Personalidade', icon: 'solar:emoji-funny-circle-bold-duotone' },
  { id: 'knowledge', label: 'Conhecimento', icon: 'solar:book-2-bold-duotone' },
  { id: 'guardrails', label: 'Guardrails', icon: 'solar:shield-check-bold-duotone' },
  { id: 'actions', label: 'Ações', icon: 'solar:bolt-bold-duotone' },
  { id: 'channels', label: 'Canais', icon: 'solar:chat-round-dots-bold-duotone' },
];

// ----------------------------------------------------------------------

export function NeoAgentNewEditForm({ agentId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!agentId;

  // Get template from URL (for new agents)
  const urlTemplate = searchParams.get('template');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('identity');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState(urlTemplate || 'custom');
  const [isActive, setIsActive] = useState(true);

  // Personality
  const [tone, setTone] = useState('friendly');
  const [formality, setFormality] = useState('balanced');
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [emojiUsage, setEmojiUsage] = useState('minimal');
  const [responseStyle, setResponseStyle] = useState('whatsapp');
  const [language, setLanguage] = useState('pt');
  const [maxMessages, setMaxMessages] = useState(4);
  const [maxResponseLength, setMaxResponseLength] = useState(300);

  // Knowledge
  const [linkedEntities, setLinkedEntities] = useState([]);
  const [entityPickerOpen, setEntityPickerOpen] = useState(false);
  const [availableEntities, setAvailableEntities] = useState([]);

  // Guardrails
  const [avoidTopics, setAvoidTopics] = useState([]);
  const [escalationTriggers, setEscalationTriggers] = useState([]);
  const [customGuardrails, setCustomGuardrails] = useState('');

  // Actions
  const [enabledActions, setEnabledActions] = useState(['send_message', 'handoff_human']);

  // Channels
  const [enabledChannels, setEnabledChannels] = useState([]);

  // Get template info
  const templateInfo = useMemo(
    () => agentSchemas.templates.find((t) => t.id === template) || agentSchemas.templates[7],
    [template]
  );

  // Initialize from template
  useEffect(() => {
    if (!isEdit && templateInfo?.defaultConfig) {
      const config = templateInfo.defaultConfig;
      if (config.personality) {
        setTone(config.personality.tone || 'friendly');
        setFormality(config.personality.formality || 'balanced');
        setSelectedTraits(config.personality.traits || []);
        setEmojiUsage(config.personality.emojiUsage || 'minimal');
        setResponseStyle(config.personality.responseStyle || 'whatsapp');
        setLanguage(config.personality.language || 'pt');
        setMaxMessages(config.personality.maxMessages || 4);
        setMaxResponseLength(config.personality.maxResponseLength || config.guardrails?.maxResponseLength || 300);
      }
      if (config.guardrails) {
        setAvoidTopics(config.guardrails.avoidTopics || []);
        setEscalationTriggers(config.guardrails.escalationTriggers || []);
      }
    }
  }, [isEdit, templateInfo]);

  // Fetch available entities
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

  // Fetch agent if editing
  useEffect(() => {
    if (isEdit) {
      const fetchAgent = async () => {
        try {
          setLoading(true);
          const response = await axios.get(`/api/v1/neo-agents/${agentId}`);
          const agent = response.data;

          setName(agent.name);
          setDescription(agent.description || '');
          setTemplate(agent.template);
          setIsActive(agent.is_active);

          // Personality
          setTone(agent.config?.personality?.tone || 'friendly');
          setFormality(agent.config?.personality?.formality || 'balanced');
          setSelectedTraits(agent.config?.personality?.traits || []);
          setCustomInstructions(agent.config?.personality?.custom_instructions || '');
          setEmojiUsage(agent.config?.personality?.emoji_usage || 'minimal');
          setResponseStyle(agent.config?.personality?.response_style || 'whatsapp');
          setLanguage(agent.config?.personality?.language || 'pt');
          setMaxMessages(agent.config?.personality?.max_messages || 4);
          setMaxResponseLength(agent.config?.personality?.max_response_length || 300);

          // Knowledge
          setLinkedEntities(agent.linked_entities || []);

          // Guardrails
          setAvoidTopics(agent.config?.guardrails?.avoid_topics || []);
          setEscalationTriggers(agent.config?.guardrails?.escalation_triggers || []);
          setCustomGuardrails(agent.config?.guardrails?.custom || '');

          // Actions
          setEnabledActions(agent.config?.actions || ['send_message', 'handoff_human']);

          // Channels
          setEnabledChannels(agent.channels || []);
        } catch (error) {
          console.error('Failed to fetch agent:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchAgent();
    }
  }, [isEdit, agentId]);

  // Handlers
  const handleTraitToggle = (traitId) => {
    setSelectedTraits((prev) =>
      prev.includes(traitId) ? prev.filter((t) => t !== traitId) : [...prev, traitId]
    );
  };

  const handleTopicToggle = (topicId) => {
    setAvoidTopics((prev) =>
      prev.includes(topicId) ? prev.filter((t) => t !== topicId) : [...prev, topicId]
    );
  };

  const handleTriggerToggle = (triggerId) => {
    setEscalationTriggers((prev) =>
      prev.includes(triggerId) ? prev.filter((t) => t !== triggerId) : [...prev, triggerId]
    );
  };

  const handleActionToggle = (actionId) => {
    setEnabledActions((prev) =>
      prev.includes(actionId) ? prev.filter((a) => a !== actionId) : [...prev, actionId]
    );
  };

  const handleChannelToggle = (channelId) => {
    setEnabledChannels((prev) =>
      prev.includes(channelId) ? prev.filter((c) => c !== channelId) : [...prev, channelId]
    );
  };

  const handleEntityToggle = (entityId) => {
    setLinkedEntities((prev) =>
      prev.includes(entityId) ? prev.filter((e) => e !== entityId) : [...prev, entityId]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name,
      description: description || null,
      template,
      is_active: isActive,
      channels: enabledChannels,
      linked_entities: linkedEntities,
      config: {
        personality: {
          tone,
          formality,
          traits: selectedTraits,
          custom_instructions: customInstructions || null,
          emoji_usage: emojiUsage,
          response_style: responseStyle,
          language,
          max_messages: maxMessages,
          max_response_length: maxResponseLength,
        },
        guardrails: {
          avoid_topics: avoidTopics,
          escalation_triggers: escalationTriggers,
          custom: customGuardrails || null,
        },
        actions: enabledActions,
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
  };

  const getCategoryInfo = (categoryId) => {
    return entitySchemas.categories.find((c) => c.id === categoryId) || {
      name: categoryId,
      icon: 'solar:widget-add-bold-duotone',
      color: '#757575',
    };
  };

  if (loading) {
    return (
      <DashboardContent>
        <Typography>Carregando...</Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="lg">
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <IconButton onClick={() => navigate(paths.dashboard.neoAgent.root)}>
          <Iconify icon="eva:chevron-left-fill" />
        </IconButton>
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: `${templateInfo.color}15`,
            color: templateInfo.color,
          }}
        >
          <Iconify icon={templateInfo.icon} width={28} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">{isEdit ? 'Editar Agente' : 'Novo Agente'}</Typography>
          <Chip
            size="small"
            label={templateInfo.name}
            sx={{
              mt: 0.5,
              bgcolor: `${templateInfo.color}15`,
              color: templateInfo.color,
              fontWeight: 600,
            }}
          />
        </Box>
        <FormControlLabel
          control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
          label={isActive ? 'Ativo' : 'Inativo'}
        />
      </Stack>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Sidebar Navigation */}
          <Card sx={{ width: 220, flexShrink: 0, alignSelf: 'flex-start' }}>
            <List disablePadding>
              {SECTIONS.map((section) => (
                <ListItemButton
                  key={section.id}
                  selected={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                  sx={{
                    py: 1.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.lighter',
                      borderRight: '3px solid',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Iconify icon={section.icon} />
                  </ListItemIcon>
                  <ListItemText primary={section.label} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              ))}
            </List>
          </Card>

          {/* Content */}
          <Box sx={{ flex: 1 }}>
            {/* Identity Section */}
            {activeSection === 'identity' && (
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    Identidade do Agente
                  </Typography>

                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="Nome do Agente"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Ex: Nina, Max, Sofia..."
                      helperText="Como o agente será identificado"
                    />

                    <TextField
                      fullWidth
                      label="Descrição"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      multiline
                      rows={3}
                      placeholder="Descreva o propósito e função deste agente..."
                      helperText="Descrição interna para sua equipe"
                    />

                    <Alert severity="info" icon={<Iconify icon={templateInfo.icon} />}>
                      <Typography variant="subtitle2">{templateInfo.name}</Typography>
                      <Typography variant="body2">{templateInfo.description}</Typography>
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Personality Section */}
            {activeSection === 'personality' && (
              <Stack spacing={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                      Tom de Voz
                    </Typography>

                    <Box
                      sx={{
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: 'repeat(4, 1fr)',
                      }}
                    >
                      {agentSchemas.personalityOptions.tones.map((toneOption) => (
                        <Card
                          key={toneOption.id}
                          onClick={() => setTone(toneOption.id)}
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            textAlign: 'center',
                            border: '2px solid',
                            borderColor: tone === toneOption.id ? 'primary.main' : 'divider',
                            bgcolor: tone === toneOption.id ? 'primary.lighter' : 'transparent',
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: 'primary.light' },
                          }}
                        >
                          <Iconify
                            icon={toneOption.icon}
                            width={32}
                            sx={{ color: tone === toneOption.id ? 'primary.main' : 'text.secondary', mb: 1 }}
                          />
                          <Typography variant="body2" fontWeight={tone === toneOption.id ? 600 : 400}>
                            {toneOption.label}
                          </Typography>
                        </Card>
                      ))}
                    </Box>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                      Formalidade
                    </Typography>

                    <Stack spacing={2}>
                      {agentSchemas.personalityOptions.formalities.map((formalityOption) => (
                        <Card
                          key={formalityOption.id}
                          onClick={() => setFormality(formalityOption.id)}
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            border: '2px solid',
                            borderColor: formality === formalityOption.id ? 'primary.main' : 'divider',
                            bgcolor: formality === formalityOption.id ? 'primary.lighter' : 'transparent',
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: 'primary.light' },
                          }}
                        >
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                              <Typography variant="subtitle2">{formalityOption.label}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formalityOption.description}
                              </Typography>
                            </Box>
                            {formality === formalityOption.id && (
                              <Iconify icon="eva:checkmark-circle-2-fill" sx={{ color: 'primary.main' }} />
                            )}
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Traços de Personalidade
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Selecione os traços que definem este agente
                    </Typography>

                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {agentSchemas.personalityOptions.traits.map((trait) => (
                        <Chip
                          key={trait.id}
                          label={trait.label}
                          icon={<Iconify icon={trait.icon} width={18} />}
                          onClick={() => handleTraitToggle(trait.id)}
                          variant={selectedTraits.includes(trait.id) ? 'filled' : 'outlined'}
                          color={selectedTraits.includes(trait.id) ? 'primary' : 'default'}
                          sx={{ '& .MuiChip-icon': { color: 'inherit' } }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Response Settings */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                      Configurações de Resposta
                    </Typography>

                    <Stack spacing={3}>
                      {/* Response Style */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                          Estilo de Resposta
                        </Typography>
                        <Stack direction="row" spacing={1.5}>
                          {agentSchemas.personalityOptions.responseStyles.map((style) => (
                            <Card
                              key={style.id}
                              onClick={() => setResponseStyle(style.id)}
                              sx={{
                                p: 2,
                                flex: 1,
                                cursor: 'pointer',
                                border: '2px solid',
                                borderColor: responseStyle === style.id ? 'primary.main' : 'divider',
                                bgcolor: responseStyle === style.id ? 'primary.lighter' : 'transparent',
                                transition: 'all 0.2s',
                                '&:hover': { borderColor: 'primary.light' },
                              }}
                            >
                              <Typography variant="subtitle2">{style.label}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {style.description}
                              </Typography>
                            </Card>
                          ))}
                        </Stack>
                      </Box>

                      {/* Emoji Usage */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                          Uso de Emojis
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          {agentSchemas.personalityOptions.emojiUsages.map((emoji) => (
                            <Chip
                              key={emoji.id}
                              label={emoji.label}
                              onClick={() => setEmojiUsage(emoji.id)}
                              variant={emojiUsage === emoji.id ? 'filled' : 'outlined'}
                              color={emojiUsage === emoji.id ? 'primary' : 'default'}
                            />
                          ))}
                        </Stack>
                      </Box>

                      {/* Language */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                          Idioma
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          {agentSchemas.personalityOptions.languages.map((lang) => (
                            <Chip
                              key={lang.id}
                              label={lang.label}
                              icon={<Iconify icon={lang.icon} width={18} />}
                              onClick={() => setLanguage(lang.id)}
                              variant={language === lang.id ? 'filled' : 'outlined'}
                              color={language === lang.id ? 'primary' : 'default'}
                              sx={{ '& .MuiChip-icon': { color: 'inherit' } }}
                            />
                          ))}
                        </Stack>
                      </Box>

                      {/* Max Messages */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Máximo de Mensagens por Resposta
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          Divide respostas longas em múltiplas mensagens curtas (estilo WhatsApp)
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Slider
                            value={maxMessages}
                            onChange={(e, value) => setMaxMessages(value)}
                            min={1}
                            max={6}
                            step={1}
                            marks={[
                              { value: 1, label: '1' },
                              { value: 2, label: '2' },
                              { value: 3, label: '3' },
                              { value: 4, label: '4' },
                              { value: 5, label: '5' },
                              { value: 6, label: '6' },
                            ]}
                            sx={{ flex: 1 }}
                          />
                          <Typography variant="body2" sx={{ minWidth: 80 }}>
                            {maxMessages} {maxMessages === 1 ? 'mensagem' : 'mensagens'}
                          </Typography>
                        </Stack>
                      </Box>

                      {/* Max Response Length */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Tamanho Máximo de Resposta
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          Limite de caracteres por resposta completa
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Slider
                            value={maxResponseLength}
                            onChange={(e, value) => setMaxResponseLength(value)}
                            min={50}
                            max={800}
                            step={50}
                            marks={[
                              { value: 100, label: 'Curto' },
                              { value: 300, label: 'Médio' },
                              { value: 600, label: 'Longo' },
                            ]}
                            sx={{ flex: 1 }}
                          />
                          <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'right' }}>
                            ~{maxResponseLength} chars
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Instruções Personalizadas
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Instruções adicionais em linguagem natural
                    </Typography>

                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Ex: Sempre mencione que temos garantia de 7 dias. Use exemplos práticos. Evite respostas muito longas..."
                    />
                  </CardContent>
                </Card>
              </Stack>
            )}

            {/* Knowledge Section */}
            {activeSection === 'knowledge' && (
              <Stack spacing={3}>
                <Card>
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                      <Box>
                        <Typography variant="h6">Entidades Vinculadas</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Selecione as entidades que este agente pode acessar
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={() => setEntityPickerOpen(true)}
                      >
                        Vincular Entidades
                      </Button>
                    </Stack>

                    {linkedEntities.length === 0 ? (
                      <Alert severity="info">
                        Nenhuma entidade vinculada. O agente não terá acesso a conhecimento estruturado.
                      </Alert>
                    ) : (
                      <Stack spacing={1}>
                        {linkedEntities.map((entityId) => {
                          const entity = availableEntities.find((e) => e.id === entityId);
                          if (!entity) return null;
                          const categoryInfo = getCategoryInfo(entity.category);
                          return (
                            <Card
                              key={entityId}
                              variant="outlined"
                              sx={{ p: 1.5 }}
                            >
                              <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                  <Box
                                    sx={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      bgcolor: `${categoryInfo.color}15`,
                                    }}
                                  >
                                    <Iconify icon={categoryInfo.icon} sx={{ color: categoryInfo.color }} />
                                  </Box>
                                  <Box>
                                    <Typography variant="subtitle2">{entity.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {categoryInfo.name}
                                    </Typography>
                                  </Box>
                                </Stack>
                                <IconButton size="small" onClick={() => handleEntityToggle(entityId)}>
                                  <Iconify icon="eva:close-fill" />
                                </IconButton>
                              </Stack>
                            </Card>
                          );
                        })}
                      </Stack>
                    )}

                    {templateInfo.suggestedEntities?.length > 0 && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">Entidades Sugeridas</Typography>
                        <Typography variant="body2">
                          Para o template {templateInfo.name}, recomendamos vincular:{' '}
                          {templateInfo.suggestedEntities.join(', ')}
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <Alert severity="info">
                  <Typography variant="subtitle2">Como funciona?</Typography>
                  <Typography variant="body2">
                    Entidades vinculadas serão convertidas em conhecimento que o agente pode consultar durante conversas.
                    Use a página de Entidades para criar e gerenciar seus dados estruturados.
                  </Typography>
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => navigate(paths.dashboard.entity.root)}
                  >
                    Ir para Entidades
                  </Button>
                </Alert>
              </Stack>
            )}

            {/* Guardrails Section */}
            {activeSection === 'guardrails' && (
              <Stack spacing={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Tópicos a Evitar
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      O agente não falará sobre estes assuntos
                    </Typography>

                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {agentSchemas.guardrailOptions.commonAvoidTopics.map((topic) => (
                        <Chip
                          key={topic.id}
                          label={topic.label}
                          onClick={() => handleTopicToggle(topic.id)}
                          variant={avoidTopics.includes(topic.id) ? 'filled' : 'outlined'}
                          color={avoidTopics.includes(topic.id) ? 'error' : 'default'}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Gatilhos de Escalonamento
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Situações que devem transferir para um humano
                    </Typography>

                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {agentSchemas.guardrailOptions.commonEscalationTriggers.map((trigger) => (
                        <Chip
                          key={trigger.id}
                          label={trigger.label}
                          onClick={() => handleTriggerToggle(trigger.id)}
                          variant={escalationTriggers.includes(trigger.id) ? 'filled' : 'outlined'}
                          color={escalationTriggers.includes(trigger.id) ? 'warning' : 'default'}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Regras Personalizadas
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Restrições adicionais em linguagem natural
                    </Typography>

                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={customGuardrails}
                      onChange={(e) => setCustomGuardrails(e.target.value)}
                      placeholder="Ex: Nunca mencione promoções sem aprovação. Sempre redirecione dúvidas técnicas para o suporte..."
                    />
                  </CardContent>
                </Card>
              </Stack>
            )}

            {/* Actions Section */}
            {activeSection === 'actions' && (
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Ações Habilitadas
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    O que este agente pode fazer durante conversas
                  </Typography>

                  <Stack spacing={1}>
                    {agentSchemas.actionTypes.map((action) => (
                      <Card
                        key={action.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          border: '2px solid',
                          borderColor: enabledActions.includes(action.id) ? 'primary.main' : 'divider',
                          bgcolor: enabledActions.includes(action.id) ? 'primary.lighter' : 'transparent',
                          opacity: action.requiresIntegration ? 0.6 : 1,
                        }}
                        onClick={() => !action.requiresIntegration && handleActionToggle(action.id)}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: enabledActions.includes(action.id) ? 'primary.main' : 'grey.200',
                              }}
                            >
                              <Iconify
                                icon={action.icon}
                                sx={{ color: enabledActions.includes(action.id) ? 'white' : 'text.secondary' }}
                              />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2">{action.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {action.description}
                              </Typography>
                            </Box>
                          </Stack>
                          {action.requiresIntegration ? (
                            <Chip label="Requer integração" size="small" variant="outlined" />
                          ) : (
                            <Switch checked={enabledActions.includes(action.id)} />
                          )}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Channels Section */}
            {activeSection === 'channels' && (
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Canais de Comunicação
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Onde este agente estará disponível
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: 'repeat(3, 1fr)',
                    }}
                  >
                    {agentSchemas.channels.map((channel) => (
                      <Card
                        key={channel.id}
                        onClick={() => handleChannelToggle(channel.id)}
                        sx={{
                          p: 2.5,
                          cursor: 'pointer',
                          textAlign: 'center',
                          border: '2px solid',
                          borderColor: enabledChannels.includes(channel.id) ? channel.color : 'divider',
                          bgcolor: enabledChannels.includes(channel.id) ? `${channel.color}10` : 'transparent',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: channel.color },
                        }}
                      >
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: `${channel.color}20`,
                            mx: 'auto',
                            mb: 1.5,
                          }}
                        >
                          <Iconify icon={channel.icon} width={28} sx={{ color: channel.color }} />
                        </Box>
                        <Typography variant="subtitle2">{channel.name}</Typography>
                        {enabledChannels.includes(channel.id) && (
                          <Chip
                            label="Ativo"
                            size="small"
                            sx={{ mt: 1, bgcolor: channel.color, color: 'white' }}
                          />
                        )}
                      </Card>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button variant="outlined" onClick={() => navigate(paths.dashboard.neoAgent.root)}>
                Cancelar
              </Button>
              <Button variant="contained" type="submit" disabled={saving || !name}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Agente'}
              </Button>
            </Stack>
          </Box>
        </Box>
      </form>

      {/* Entity Picker Dialog */}
      <EntityPickerDialog
        open={entityPickerOpen}
        onClose={() => setEntityPickerOpen(false)}
        selectedEntities={linkedEntities}
        availableEntities={availableEntities}
        onToggle={handleEntityToggle}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function EntityPickerDialog({ open, onClose, selectedEntities, availableEntities, onToggle }) {
  const [searchQuery, setSearchQuery] = useState('');

  const getCategoryInfo = (categoryId) => {
    return entitySchemas.categories.find((c) => c.id === categoryId) || {
      name: categoryId,
      icon: 'solar:widget-add-bold-duotone',
      color: '#757575',
    };
  };

  const filteredEntities = availableEntities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const entitiesByCategory = filteredEntities.reduce((acc, entity) => {
    if (!acc[entity.category]) {
      acc[entity.category] = [];
    }
    acc[entity.category].push(entity);
    return acc;
  }, {});

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Vincular Entidades</Typography>
          <IconButton onClick={onClose} size="small">
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <TextField
          fullWidth
          placeholder="Buscar entidades..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        {Object.entries(entitiesByCategory).map(([categoryId, entities]) => {
          const categoryInfo = getCategoryInfo(categoryId);
          return (
            <Box key={categoryId} sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Iconify icon={categoryInfo.icon} sx={{ color: categoryInfo.color }} />
                <Typography variant="subtitle2">{categoryInfo.name}</Typography>
              </Stack>
              <List disablePadding>
                {entities.map((entity) => (
                  <ListItem key={entity.id} disablePadding>
                    <ListItemButton onClick={() => onToggle(entity.id)} dense>
                      <Checkbox
                        edge="start"
                        checked={selectedEntities.includes(entity.id)}
                        disableRipple
                      />
                      <ListItemText
                        primary={entity.name}
                        secondary={entity.description}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          );
        })}

        {filteredEntities.length === 0 && (
          <Alert severity="info">
            Nenhuma entidade encontrada. Crie entidades primeiro na página de Entidades.
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
