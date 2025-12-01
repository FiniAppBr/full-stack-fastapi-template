import { m } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Accordion from '@mui/material/Accordion';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import useMediaQuery from '@mui/material/useMediaQuery';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const CHAT_ENDPOINT = '/api/v1/chat/chat';

// Translations
const MODE_LABELS = {
  conexao: 'Conexão',
  descoberta: 'Descoberta',
  validacao: 'Validação',
  objecao: 'Objeção',
  negociacao: 'Negociação',
  fechamento: 'Fechamento',
  pos_venda: 'Pós-venda',
  reengajamento: 'Reengajamento',
  encerramento: 'Encerramento',
  handoff: 'Handoff',
};

const SIGNAL_LABELS = {
  intent: 'Intenção',
  tipo_objecao: 'Tipo de Objeção',
  nivel_interesse: 'Nível de Interesse',
  engajamento: 'Engajamento',
};

const GATE_LABELS = {
  name_captured: 'Nome capturado',
  skill_identified: 'Nível identificado',
  need_identified: 'Necessidade identificada',
  interest_confirmed: 'Interesse confirmado',
  link_offered: 'Link oferecido',
  link_sent: 'Link enviado',
  purchased: 'Comprou',
};

const TRAIT_LABELS = {
  customer_name: 'Nome',
  skill_level: 'Nível',
  use_case: 'Objetivo',
  learning_style: 'Estilo de aprendizado',
  time_availability: 'Disponibilidade',
};

// Color mappings
const INTERESSE_COLORS = {
  frio: { color: 'info', label: 'Frio' },
  morno: { color: 'warning', label: 'Morno' },
  quente: { color: 'error', label: 'Quente' },
};

const ENGAJAMENTO_COLORS = {
  passivo: { color: 'default', label: 'Passivo' },
  ativo: { color: 'success', label: 'Ativo' },
};

const OBJECAO_COLORS = {
  nenhum: { color: 'default', label: 'Nenhuma' },
  preco: { color: 'error', label: 'Preço' },
  tempo: { color: 'warning', label: 'Tempo' },
  confianca: { color: 'info', label: 'Confiança' },
  necessidade: { color: 'secondary', label: 'Necessidade' },
  autoridade: { color: 'primary', label: 'Autoridade' },
};

const INTENT_LABELS = {
  saudacao: 'Saudação',
  pergunta: 'Pergunta',
  objecao: 'Objeção',
  interesse: 'Interesse',
  compra: 'Compra',
  despedida: 'Despedida',
  reclamacao: 'Reclamação',
  elogio: 'Elogio',
  duvida: 'Dúvida',
};

const RULE_LABELS = {
  rule_block_pricing: 'Bloquear preço (sem interesse)',
  rule_conexao_content: 'Conteúdo de conexão',
  rule_descoberta_content: 'Conteúdo de descoberta',
  rule_validacao_content: 'Conteúdo de validação',
  rule_objecao_preco: 'Objeção de preço',
  rule_objecao_tempo: 'Objeção de tempo',
  rule_objecao_confianca: 'Objeção de confiança',
  rule_question_search: 'Busca por pergunta',
  rule_price_content: 'Conteúdo de preço',
  rule_fechamento_content: 'Conteúdo de fechamento',
  rule_igreja_content: 'Conteúdo para igreja',
  rule_profissional_content: 'Conteúdo profissional',
  rule_hobby_content: 'Conteúdo hobby',
  rule_iniciante_content: 'Conteúdo iniciante',
  rule_intermediario_content: 'Conteúdo intermediário',
  rule_link_ready: 'Pronto para link',
  rule_pos_venda: 'Pós-venda',
  rule_handoff: 'Transferir para humano',
};

export function NinaDebugView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [threadId, setThreadId] = useState(`debug-${Date.now()}`);
  const [lastState, setLastState] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // Agent selection
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [loadingAgents, setLoadingAgents] = useState(true);

  // Fetch agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await axios.get(endpoints.neoAgents.list);
        const agentList = response.data.data || [];
        setAgents(agentList);
        // Default to first agent if available
        if (agentList.length > 0) {
          setSelectedAgentId(agentList[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(CHAT_ENDPOINT, {
        message: userMessage,
        thread_id: threadId,
        agent_id: selectedAgentId,
      });

      const {data} = response;
      setLoading(false); // Stop initial loading spinner

      // Handle v3 response format (messages with content, typing_delay_ms)
      // or v2 format (messages with text, typing_time or response string)
      const msgList = data.messages?.length > 0 ? data.messages : (data.response ? [{ content: data.response }] : []);

      if (msgList && msgList.length > 0) {
        let cumulativeDelay = 0;

        msgList.forEach((msg, idx) => {
          const isLast = idx === msgList.length - 1;
          // Support both v2 (text, typing_time) and v3 (content, typing_delay_ms) formats
          const msgText = msg.content || msg.text || String(msg);
          const typingTime = (msg.typing_delay_ms ? msg.typing_delay_ms / 1000 : null) || msg.typing_time || 0.8;

          // Show typing indicator at start of this message's delay
          setTimeout(() => {
            setIsTyping(true);
          }, cumulativeDelay * 1000);

          // Show message after typing delay and hide typing indicator
          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: msgText,
              typingTime,
              delta: isLast ? data.delta : null  // Only last message gets delta (v2 only)
            }]);
          }, (cumulativeDelay + typingTime) * 1000);

          cumulativeDelay += typingTime + ((msg.pause_after_ms || 0) / 1000);
        });
      }

      // Save state for display (normalize v2 and v3 formats)
      const normalizedState = {
        ...data,
        // v3 has state.traits, state.events, etc. - lift them up for display
        mode: data.mode || 'v3',
        turn_count: data.turn_count || data.state?.turn_count || 0,
        traits: data.traits || data.state?.traits || {},
        events: data.state?.events || {},
        objections_raised: data.state?.objections_raised || [],
        gates: data.gates || {},
        signals: data.signals || {},
        chunks: data.chunks || [],
        rules_fired: data.rules_fired || [],
        total_chunk_tokens: data.total_chunk_tokens || 0,
        agent_name: data.agent_name,
        tokens_used: data.tokens_used,
      };
      setLastState(normalizedState);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'error', content: `Error: ${error.message || 'Failed to send message'}` }]);
      setLoading(false);
    }
  }, [input, loading, threadId, selectedAgentId]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setLastState(null);
    setThreadId(`debug-${Date.now()}`);
  };

  // State panel content - reusable for both desktop and mobile
  const statePanelContent = (
    <Scrollbar sx={{ flex: 1 }}>
      {lastState ? (
        <Stack sx={{ p: 1 }}>
          {/* Agent & Turn Info */}
          <StateAccordion title="Agent Info" defaultExpanded>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Chip label={lastState.agent_name || selectedAgent?.name || 'Unknown'} color="primary" />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Turno {lastState.turn_count}
                </Typography>
              </Stack>
              {lastState.tokens_used > 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Tokens: {lastState.tokens_used}
                </Typography>
              )}
            </Stack>
          </StateAccordion>

          {/* Mode (v2 only) */}
          {lastState.mode && lastState.mode !== 'v3' && (
          <StateAccordion title="Modo Atual" defaultExpanded>
            <Stack direction="row" alignItems="center" gap={1}>
              <Chip label={MODE_LABELS[lastState.mode] || lastState.mode} color="primary" />
            </Stack>
          </StateAccordion>
          )}

          {/* Signals (v2 only - show if non-empty) */}
          {Object.keys(lastState.signals || {}).length > 0 && (
            <StateAccordion title="Sinais (este turno)" defaultExpanded>
              <Stack spacing={1}>
                {Object.entries(lastState.signals || {}).map(([key, value]) => (
                  <SignalChip key={key} signalKey={key} value={value} />
                ))}
              </Stack>
            </StateAccordion>
          )}

          {/* Gates (v2 only - show if non-empty) */}
          {Object.keys(lastState.gates || {}).length > 0 && (
            <StateAccordion title="Gates (checkpoints)" defaultExpanded>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {Object.entries(lastState.gates || {}).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={GATE_LABELS[key] || key}
                    size="small"
                    color={value ? 'success' : 'default'}
                    variant={value ? 'filled' : 'outlined'}
                    icon={value ? <Iconify icon="solar:check-circle-bold" width={16} /> : undefined}
                  />
                ))}
              </Stack>
            </StateAccordion>
          )}

          {/* Traits */}
          <StateAccordion title="Perfil do Cliente (Traits)" defaultExpanded>
            <Stack spacing={0.5}>
              {Object.keys(lastState.traits || {}).length > 0 ? (
                Object.entries(lastState.traits || {}).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 120 }}>
                      {TRAIT_LABELS[key] || key}:
                    </Typography>
                    <Typography variant="caption" color={value ? 'text.primary' : 'text.disabled'}>
                      {typeof value === 'object' ? JSON.stringify(value) : (value || '—')}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="caption" color="text.secondary">Nenhum trait capturado ainda</Typography>
              )}
            </Stack>
          </StateAccordion>

          {/* Events (v3) */}
          {Object.keys(lastState.events || {}).length > 0 && (
            <StateAccordion title="Eventos (Events)" defaultExpanded>
              <Stack spacing={0.5}>
                {Object.entries(lastState.events || {}).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={key}
                      size="small"
                      color={value ? 'success' : 'default'}
                      variant={value ? 'filled' : 'outlined'}
                    />
                  </Box>
                ))}
              </Stack>
            </StateAccordion>
          )}

          {/* Objections Raised (v3) */}
          {(lastState.objections_raised || []).length > 0 && (
            <StateAccordion title="Objeções Levantadas" defaultExpanded>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {lastState.objections_raised.map((obj, idx) => (
                  <Chip key={idx} label={obj} size="small" color="warning" />
                ))}
              </Stack>
            </StateAccordion>
          )}

          {/* Chunks (v2 only - show if non-empty) */}
          {(lastState.chunks || []).length > 0 && (
            <StateAccordion title={`Contexto RAG (${lastState.chunks?.length || 0} chunks, ${lastState.total_chunk_tokens} tokens)`} defaultExpanded>
              <Stack spacing={1}>
                {(lastState.chunks || []).map((chunk, idx) => (
                  <Card key={idx} variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" fontWeight={600}>
                      {chunk.title || 'Sem título'}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: 10 }}>
                      Similaridade: {chunk.score?.toFixed(2) || 'N/A'} | Regra: {RULE_LABELS[chunk.source_rule] || chunk.source_rule || 'N/A'} | {chunk.token_count} tokens
                    </Typography>
                    {chunk.labels && chunk.labels.length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                        {chunk.labels.map((label) => (
                          <Chip key={label} label={label} size="small" sx={{ height: 18, fontSize: 10 }} />
                        ))}
                      </Stack>
                    )}
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', fontSize: 11, color: 'text.secondary' }}>
                      {chunk.content}
                    </Typography>
                  </Card>
                ))}
              </Stack>
            </StateAccordion>
          )}

          {/* Rules Fired (v2 only - show if non-empty) */}
          {(lastState.rules_fired || []).length > 0 && (
            <StateAccordion title="Regras Disparadas" defaultExpanded>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {(lastState.rules_fired || []).map((rule) => (
                  <Chip key={rule} label={RULE_LABELS[rule] || rule} size="small" color="warning" />
                ))}
              </Stack>
            </StateAccordion>
          )}
        </Stack>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          <Iconify icon="solar:chat-dots-bold-duotone" width={48} sx={{ mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">Envie uma mensagem para ver o estado</Typography>
        </Box>
      )}
    </Scrollbar>
  );

  return (
    <DashboardContent
      maxWidth={false}
      sx={{ p: { xs: 0, md: 2 } }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 0, md: 2 },
          height: 'calc(100vh - 100px)',
        }}
      >
        {/* Chat Panel - Full width */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', borderRadius: { xs: 0, md: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h6">Agent Debug</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Agent</InputLabel>
              <Select
                value={selectedAgentId || ''}
                label="Agent"
                onChange={(e) => {
                  setSelectedAgentId(e.target.value);
                  handleReset();
                }}
                disabled={loadingAgents}
              >
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedAgent && (
              <Chip
                label={selectedAgent.template || 'custom'}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" color="error" onClick={handleReset} startIcon={<Iconify icon="solar:restart-bold" />}>
              Reiniciar
            </Button>
            {isMobile && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setDrawerOpen(true)}
                startIcon={<Iconify icon="solar:tuning-2-bold" />}
              >
                Estado
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Messages */}
        <Scrollbar sx={{ flex: 1, p: 2 }}>
          <Stack spacing={2}>
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <CircularProgress size={24} />
              </Box>
            )}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </Stack>
        </Scrollbar>

        {/* Input */}
        <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Digite uma mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <IconButton color="primary" onClick={handleSend} disabled={loading || !input.trim()}>
            <Iconify icon="solar:plain-bold" />
          </IconButton>
        </Stack>
      </Card>

      {/* Desktop: State Panel Sidebar */}
      {!isMobile && (
        <Card sx={{ width: 420, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            Estado do Pipeline
          </Typography>
          {statePanelContent}
        </Card>
      )}

      </Box>

      {/* Mobile: State Panel Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 } }
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Estado do Pipeline</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <Iconify icon="solar:close-circle-bold" />
          </IconButton>
        </Stack>
        {statePanelContent}
      </Drawer>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const {delta} = message;

  // Check if delta has any meaningful content
  const hasDelta = delta && (
    delta.mode_changed ||
    delta.gates_activated?.length > 0 ||
    Object.keys(delta.traits_updated || {}).length > 0 ||
    Object.values(delta.signals || {}).some(v => v) ||
    delta.rules_fired?.length > 0
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <Box
        sx={{
          maxWidth: '80%',
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: isError ? 'error.lighter' : isUser ? 'primary.main' : 'grey.200',
          color: isError ? 'error.dark' : isUser ? 'primary.contrastText' : 'text.primary',
        }}
      >
        <Typography variant="body2">
          {typeof message.content === 'object' ? message.content.text || JSON.stringify(message.content) : message.content}
        </Typography>
      </Box>

      {/* Compact delta display below assistant message */}
      {!isUser && !isError && hasDelta && (
        <DeltaDisplay delta={delta} />
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

function DeltaDisplay({ delta }) {
  if (!delta) return null;

  const items = [];

  // Colorless chip style
  const chipSx = {
    height: 20,
    fontSize: 10,
    bgcolor: 'grey.200',
    color: 'text.secondary',
    '& .MuiChip-icon': { color: 'text.secondary' }
  };

  // Mode change
  if (delta.mode_changed) {
    items.push(
      <Chip
        key="mode"
        icon={<Iconify icon="solar:arrow-right-bold" width={12} />}
        label={MODE_LABELS[delta.mode_changed] || delta.mode_changed}
        size="small"
        sx={chipSx}
      />
    );
  }

  // Gates activated
  delta.gates_activated?.forEach((gate) => {
    items.push(
      <Chip
        key={`gate-${gate}`}
        icon={<Iconify icon="solar:check-circle-bold" width={12} />}
        label={GATE_LABELS[gate] || gate}
        size="small"
        sx={chipSx}
      />
    );
  });

  // Traits updated
  Object.entries(delta.traits_updated || {}).forEach(([key, value]) => {
    items.push(
      <Chip
        key={`trait-${key}`}
        label={`${TRAIT_LABELS[key] || key}: ${value}`}
        size="small"
        sx={chipSx}
      />
    );
  });

  // Signals (only non-null)
  Object.entries(delta.signals || {}).forEach(([key, value]) => {
    if (!value) return;

    let displayValue = value;

    if (key === 'nivel_interesse') {
      const config = INTERESSE_COLORS[value];
      if (config) displayValue = config.label;
    } else if (key === 'engajamento') {
      const config = ENGAJAMENTO_COLORS[value];
      if (config) displayValue = config.label;
    } else if (key === 'tipo_objecao') {
      if (value === 'nenhum') return; // Skip "none" objection
      const config = OBJECAO_COLORS[value];
      if (config) displayValue = config.label;
    } else if (key === 'intent') {
      displayValue = INTENT_LABELS[value] || value;
    }

    items.push(
      <Chip
        key={`signal-${key}`}
        label={`${SIGNAL_LABELS[key] || key}: ${displayValue}`}
        size="small"
        sx={chipSx}
      />
    );
  });

  if (items.length === 0) return null;

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      gap={0.5}
      sx={{
        mt: 0.5,
        px: 1,
        py: 0.5,
        maxWidth: '80%',
      }}
    >
      {items}
    </Stack>
  );
}

// ----------------------------------------------------------------------

function StateAccordion({ title, children, defaultExpanded = false }) {
  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters sx={{ '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold" />}>
        <Typography variant="subtitle2">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

// ----------------------------------------------------------------------

function SignalChip({ signalKey, value }) {
  const label = SIGNAL_LABELS[signalKey] || signalKey;

  // Get color and display value based on signal type
  let chipColor = 'default';
  let displayValue = value || '—';

  if (signalKey === 'nivel_interesse' && value) {
    const config = INTERESSE_COLORS[value];
    if (config) {
      chipColor = config.color;
      displayValue = config.label;
    }
  } else if (signalKey === 'engajamento' && value) {
    const config = ENGAJAMENTO_COLORS[value];
    if (config) {
      chipColor = config.color;
      displayValue = config.label;
    }
  } else if (signalKey === 'tipo_objecao' && value) {
    const config = OBJECAO_COLORS[value];
    if (config) {
      chipColor = config.color;
      displayValue = config.label;
    }
  } else if (signalKey === 'intent' && value) {
    displayValue = INTENT_LABELS[value] || value;
    chipColor = 'primary';
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 120 }}>
        {label}:
      </Typography>
      <Chip
        label={displayValue}
        size="small"
        color={chipColor}
        variant={value ? 'filled' : 'outlined'}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

const dotVariants = {
  initial: { y: 0 },
  animate: { y: -6 },
};

const dotTransition = {
  duration: 0.4,
  repeat: Infinity,
  repeatType: 'reverse',
  ease: 'easeInOut',
};

function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 2,
          bgcolor: 'grey.200',
          display: 'flex',
          gap: 0.5,
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <m.div
            key={i}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ ...dotTransition, delay: i * 0.15 }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#9e9e9e',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
