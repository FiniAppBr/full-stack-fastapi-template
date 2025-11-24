import { useState, useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetNinaLogs, useGetNinaConversation, calculateConversationCost } from 'src/actions/nina-logs';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

// Label mappings (reused from nina-debug)
const MODE_LABELS = {
  conexao: 'Conexão',
  descoberta: 'Descoberta',
  validacao: 'Validação',
  objecao: 'Objeção',
  objection_handling: 'Objeção',
  negociacao: 'Negociação',
  fechamento: 'Fechamento',
  pos_venda: 'Pós-venda',
  reengajamento: 'Reengajamento',
  encerramento: 'Encerramento',
  handoff: 'Handoff',
};

const GATE_LABELS = {
  name_captured: 'Nome',
  skill_identified: 'Nível',
  need_identified: 'Necessidade',
  interest_confirmed: 'Interesse',
  price_revealed: 'Preço',
  link_offered: 'Link oferecido',
  link_sent: 'Link enviado',
  purchased: 'Comprou',
};

const TRAIT_LABELS = {
  customer_name: 'Nome',
  skill_level: 'Nível',
  use_case: 'Objetivo',
  learning_style: 'Estilo',
  time_availability: 'Tempo',
  current_need: 'Necessidade',
};

const INTENT_LABELS = {
  saudacao: 'Saudação',
  pergunta: 'Pergunta',
  objecao: 'Objeção',
  interesse: 'Interesse',
  pronto_comprar: 'Pronto p/ comprar',
  nao_pronto: 'Não pronto',
  compra: 'Compra',
  despedida: 'Despedida',
  reclamacao: 'Reclamação',
  elogio: 'Elogio',
  duvida: 'Dúvida',
};

const INTERESSE_CONFIG = {
  frio: { icon: '❄️', label: 'Frio', color: 'info' },
  morno: { icon: '🌤️', label: 'Morno', color: 'warning' },
  quente: { icon: '🔥', label: 'Quente', color: 'error' },
};

const OBJECTION_LABELS = {
  dinheiro: 'Dinheiro',
  tempo: 'Tempo',
  confianca: 'Confiança',
  metodo: 'Método',
  nenhum: null,
};

// ----------------------------------------------------------------------

export function ConversationReplayView() {
  const { logs, logsLoading } = useGetNinaLogs();
  const [selectedThread, setSelectedThread] = useState('');
  const { turns, conversationLoading } = useGetNinaConversation(selectedThread);
  const messagesEndRef = useRef(null);

  // Auto-select first log
  useEffect(() => {
    if (logs?.length > 0 && !selectedThread) {
      setSelectedThread(logs[0].thread_id);
    }
  }, [logs, selectedThread]);

  // Scroll to bottom when turns change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const cost = calculateConversationCost(turns);

  return (
    <DashboardContent maxWidth="lg">
      <Stack spacing={3}>
        {/* Header */}
        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            {/* Selector */}
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>Conversa</InputLabel>
              <Select
                value={selectedThread}
                label="Conversa"
                onChange={(e) => setSelectedThread(e.target.value)}
                disabled={logsLoading}
              >
                {logs.map((log) => (
                  <MenuItem key={log.thread_id} value={log.thread_id}>
                    {log.thread_id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Stats */}
            {!conversationLoading && turns.length > 0 && (
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Chip
                  icon={<Iconify icon="solar:chat-round-dots-bold" width={16} />}
                  label={`${cost.turns} turnos`}
                  size="small"
                  variant="soft"
                />
                <Chip
                  icon={<Iconify icon="solar:cpu-bolt-bold" width={16} />}
                  label={`~${(cost.totalTokens / 1000).toFixed(1)}k tokens`}
                  size="small"
                  variant="soft"
                />
                <Tooltip
                  title={
                    <Box>
                      <Typography variant="caption" display="block">
                        Gemini Flash Lite: R$ {cost.gemini.costBRL.toFixed(4)}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Mistral Nemo: R$ {cost.mistral.costBRL.toFixed(4)}
                      </Typography>
                    </Box>
                  }
                >
                  <Chip
                    icon={<Iconify icon="solar:wallet-money-bold" width={16} />}
                    label={`R$ ${cost.totalBRL.toFixed(2)}`}
                    size="small"
                    variant="soft"
                    color="success"
                  />
                </Tooltip>
              </Stack>
            )}
          </Stack>
        </Card>

        {/* Chat */}
        <Card sx={{ height: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column' }}>
          <Scrollbar sx={{ flex: 1, p: 2 }}>
            {conversationLoading ? (
              <Stack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Box key={i}>
                    <Skeleton variant="rounded" width="60%" height={40} sx={{ mb: 1, ml: 'auto' }} />
                    <Skeleton variant="rounded" width="70%" height={60} />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Stack spacing={3}>
                {turns.map((turn, idx) => (
                  <TurnDisplay key={idx} turn={turn} />
                ))}
                <div ref={messagesEndRef} />
              </Stack>
            )}

            {!conversationLoading && turns.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <Iconify icon="solar:chat-round-dots-bold-duotone" width={64} sx={{ mb: 2, opacity: 0.5 }} />
                <Typography>Selecione uma conversa para visualizar</Typography>
              </Box>
            )}
          </Scrollbar>
        </Card>
      </Stack>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function TurnDisplay({ turn }) {
  const { input, output, extract, mode, assemble } = turn;

  // Calculate what changed this turn
  const changes = getChanges(turn);

  return (
    <Box>
      {/* Turn header */}
      <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
          TURNO {turn.turn}
        </Typography>
      </Stack>

      {/* User message (left side - they are the customer) */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 0.5 }}>
        <Box
          sx={{
            maxWidth: '75%',
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: 'grey.100',
          }}
        >
          <Typography variant="body2">{input}</Typography>
        </Box>
      </Box>

      {/* State changes (under user message - extracted from what they said) */}
      <Box sx={{ ml: 2, pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' }}>
        <StateChanges changes={changes} extract={extract} mode={mode} />
      </Box>

      {/* Nina messages (right side - we are the bot) */}
      <Stack spacing={0.5} sx={{ mt: 1, mb: 1, alignItems: 'flex-end' }}>
        {(output?.messages || [output?.response]).map((msg, idx) => (
          <Box key={idx} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Box
              sx={{
                maxWidth: '75%',
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <Typography variant="body2">{typeof msg === 'object' ? msg.text : msg}</Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------

function getChanges(turn) {
  const { extract, mode } = turn;
  const changes = {
    modeChanged: mode?.before !== mode?.after ? mode?.after : null,
    gatesActivated: [],
    traitsUpdated: {},
  };

  // Find gates that changed from false to true
  if (extract?.gates_before && extract?.gates_after) {
    Object.entries(extract.gates_after).forEach(([key, value]) => {
      if (value && !extract.gates_before[key]) {
        changes.gatesActivated.push(key);
      }
    });
  }

  // Find traits that were set
  if (extract?.traits_before && extract?.traits_after) {
    Object.entries(extract.traits_after).forEach(([key, value]) => {
      if (value && !extract.traits_before[key]) {
        changes.traitsUpdated[key] = value;
      }
    });
  }

  return changes;
}

// ----------------------------------------------------------------------

function StateChanges({ changes, extract, mode }) {
  const signals = extract?.signals || {};
  const items = [];

  // Mode change
  if (changes.modeChanged) {
    items.push(
      <Chip
        key="mode"
        icon={<Iconify icon="solar:arrow-right-bold" width={12} />}
        label={MODE_LABELS[changes.modeChanged] || changes.modeChanged}
        size="small"
        color="secondary"
        sx={{ height: 22, fontSize: 11 }}
      />
    );
  }

  // Gates activated
  changes.gatesActivated.forEach((gate) => {
    items.push(
      <Chip
        key={`gate-${gate}`}
        icon={<Iconify icon="solar:check-circle-bold" width={12} />}
        label={GATE_LABELS[gate] || gate}
        size="small"
        color="success"
        sx={{ height: 22, fontSize: 11 }}
      />
    );
  });

  // Traits updated
  Object.entries(changes.traitsUpdated).forEach(([key, value]) => {
    items.push(
      <Chip
        key={`trait-${key}`}
        label={`${TRAIT_LABELS[key] || key}: ${value}`}
        size="small"
        color="info"
        sx={{ height: 22, fontSize: 11 }}
      />
    );
  });

  // Always show: intent, interest level, objection
  const intent = signals.intent;
  const interestLevel = signals.interest_level;
  const objectionType = signals.objection_type;
  const objectionHistory = signals.objection_history || [];

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      gap={0.5}
      justifyContent="flex-start"
      sx={{
        py: 0.5,
        px: 1,
        borderRadius: 1,
        bgcolor: 'action.hover',
        width: 'fit-content',
      }}
    >
      {/* Changes first */}
      {items}

      {/* Intent */}
      {intent && (
        <Chip
          label={INTENT_LABELS[intent] || intent}
          size="small"
          variant="outlined"
          sx={{ height: 22, fontSize: 11 }}
        />
      )}

      {/* Interest level with emoji */}
      {interestLevel && INTERESSE_CONFIG[interestLevel] && (
        <Chip
          label={`${INTERESSE_CONFIG[interestLevel].icon} ${INTERESSE_CONFIG[interestLevel].label}`}
          size="small"
          color={INTERESSE_CONFIG[interestLevel].color}
          variant="soft"
          sx={{ height: 22, fontSize: 11 }}
        />
      )}

      {/* Current objection */}
      {objectionType && OBJECTION_LABELS[objectionType] && (
        <Chip
          icon={<Iconify icon="solar:danger-triangle-bold" width={12} />}
          label={OBJECTION_LABELS[objectionType]}
          size="small"
          color="error"
          variant="soft"
          sx={{ height: 22, fontSize: 11 }}
        />
      )}

      {/* Objection history count */}
      {objectionHistory.length > 0 && (
        <Tooltip title={`Objeções: ${objectionHistory.join(', ')}`}>
          <Chip
            label={`${objectionHistory.length} objeções`}
            size="small"
            variant="outlined"
            sx={{ height: 22, fontSize: 11, color: 'text.secondary' }}
          />
        </Tooltip>
      )}

      {/* Mode badge */}
      {!changes.modeChanged && mode?.after && (
        <Chip
          icon={<Iconify icon="solar:map-point-bold" width={12} />}
          label={MODE_LABELS[mode.after] || mode.after}
          size="small"
          variant="outlined"
          sx={{ height: 22, fontSize: 11, color: 'text.secondary' }}
        />
      )}
    </Stack>
  );
}
