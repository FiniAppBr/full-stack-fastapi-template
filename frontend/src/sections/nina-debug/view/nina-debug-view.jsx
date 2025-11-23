import { useState, useRef, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import axios from 'src/utils/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const NINA_ENDPOINT = '/api/v1/nina/chat';

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
  const [threadId, setThreadId] = useState(`debug-${Date.now()}`);
  const [lastState, setLastState] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const messagesEndRef = useRef(null);

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
      const response = await axios.post(NINA_ENDPOINT, {
        message: userMessage,
        thread_id: threadId,
      });

      const data = response.data;

      // Add assistant messages - attach delta to last message only
      const msgList = data.messages?.length > 0 ? data.messages : [data.response];
      if (msgList && msgList.length > 0) {
        msgList.forEach((msg, idx) => {
          const isLast = idx === msgList.length - 1;
          setTimeout(() => {
            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: msg,
              delta: isLast ? data.delta : null  // Only last message gets delta
            }]);
          }, idx * 300);
        });
      }

      // Save state for display
      setLastState(data);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'error', content: `Error: ${error.message || 'Failed to send message'}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, threadId]);

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
          {/* Mode */}
          <StateAccordion title="Modo Atual" defaultExpanded>
            <Stack direction="row" alignItems="center" gap={1}>
              <Chip label={MODE_LABELS[lastState.mode] || lastState.mode} color="primary" />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Turno {lastState.turn_count}
              </Typography>
            </Stack>
          </StateAccordion>

          {/* Signals */}
          <StateAccordion title="Sinais (este turno)" defaultExpanded>
            <Stack spacing={1}>
              {Object.entries(lastState.signals || {}).map(([key, value]) => (
                <SignalChip key={key} signalKey={key} value={value} />
              ))}
            </Stack>
          </StateAccordion>

          {/* Gates */}
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

          {/* Traits */}
          <StateAccordion title="Perfil do Cliente" defaultExpanded>
            <Stack spacing={0.5}>
              {Object.entries(lastState.traits || {}).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 120 }}>
                    {TRAIT_LABELS[key] || key}:
                  </Typography>
                  <Typography variant="caption" color={value ? 'text.primary' : 'text.disabled'}>
                    {value || '—'}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </StateAccordion>

          {/* Chunks */}
          <StateAccordion title={`Contexto RAG (${lastState.chunks?.length || 0} chunks, ${lastState.total_chunk_tokens} tokens)`} defaultExpanded>
            <Stack spacing={1}>
              {(lastState.chunks || []).map((chunk, idx) => (
                <Card key={idx} variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="caption" fontWeight={600}>
                    {chunk.title || 'Sem título'}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: 10 }}>
                    Similaridade: {chunk.score.toFixed(2)} | Regra: {RULE_LABELS[chunk.source_rule] || chunk.source_rule} | {chunk.token_count} tokens
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                    {chunk.labels.map((label) => (
                      <Chip key={label} label={label} size="small" sx={{ height: 18, fontSize: 10 }} />
                    ))}
                  </Stack>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block', fontSize: 11, color: 'text.secondary' }}>
                    {chunk.content}
                  </Typography>
                </Card>
              ))}
              {(!lastState.chunks || lastState.chunks.length === 0) && (
                <Typography variant="caption" color="text.secondary">Nenhum chunk carregado</Typography>
              )}
            </Stack>
          </StateAccordion>

          {/* Rules Fired */}
          <StateAccordion title="Regras Disparadas" defaultExpanded>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {(lastState.rules_fired || []).map((rule) => (
                <Chip key={rule} label={RULE_LABELS[rule] || rule} size="small" color="warning" />
              ))}
              {(!lastState.rules_fired || lastState.rules_fired.length === 0) && (
                <Typography variant="caption" color="text.secondary">Nenhuma regra disparada</Typography>
              )}
            </Stack>
          </StateAccordion>
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
      sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', p: { xs: 0, md: 2 } }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          gap: { xs: 0, md: 2 },
          minHeight: 0,
        }}
      >
        {/* Chat Panel - Full width */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRadius: { xs: 0, md: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Chat com Nina</Typography>
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
  const delta = message.delta;

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
        <Typography variant="body2">{message.content}</Typography>
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
