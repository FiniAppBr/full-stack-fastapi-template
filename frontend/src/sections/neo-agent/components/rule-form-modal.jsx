import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

// Rule color (all rules are red)
const RULE_COLOR = '#F44336';

// Rule types (templates)
const RULE_TYPES = [
  {
    id: 'always_do',
    label: 'Sempre Fazer',
    icon: 'solar:check-circle-bold',
    description: 'Comportamentos obrigatórios',
    placeholder: 'Ex: Se apresentar como assistente virtual',
  },
  {
    id: 'never_do',
    label: 'Nunca Fazer',
    icon: 'solar:forbidden-circle-bold',
    description: 'Ações proibidas',
    placeholder: 'Ex: Inventar informações ou preços',
  },
  {
    id: 'escalation_rule',
    label: 'Transferir para Humano',
    icon: 'solar:hand-shake-bold',
    description: 'Quando escalar para atendente',
    placeholder: 'Ex: Cliente pede para falar com humano',
  },
];

// Trigger options
const TRIGGERS = [
  { id: 'always', label: 'Sempre' },
  { id: 'first_turn', label: 'Primeira mensagem' },
  { id: 'when_relevant', label: 'Quando relevante' },
];

export function RuleFormModal({
  open,
  onClose,
  onSave,
  entity = null,
  loading = false,
}) {
  const isEditing = Boolean(entity);

  // Form state
  const [ruleText, setRuleText] = useState('');
  const [ruleType, setRuleType] = useState(null); // null = show picker
  const [trigger, setTrigger] = useState('always');

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (isEditing && entity) {
        setRuleText(entity.name || '');
        setRuleType(entity.template || 'always_do');
        setTrigger(entity.data?.trigger || 'always');
      } else {
        setRuleText('');
        setRuleType(null);
        setTrigger('always');
      }
    }
  }, [open, isEditing, entity]);

  const currentType = RULE_TYPES.find((t) => t.id === ruleType);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: entity?.id,
      name: ruleText,
      category: 'guardrails',
      template: ruleType,
      data: { trigger },
      description: null,
      capabilities: [],
    });
  };

  // Step 1: Template picker
  if (!ruleType) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Tipo de regra
          </Typography>
          <Stack spacing={1.5}>
            {RULE_TYPES.map((type) => (
              <Box
                key={type.id}
                onClick={() => setRuleType(type.id)}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all 0.15s',
                  '&:hover': {
                    borderColor: RULE_COLOR,
                    bgcolor: `${RULE_COLOR}08`,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${RULE_COLOR}15`,
                  }}
                >
                  <Iconify icon={type.icon} width={22} sx={{ color: RULE_COLOR }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">{type.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {type.description}
                  </Typography>
                </Box>
                <Iconify icon="eva:chevron-right-fill" sx={{ color: 'text.disabled' }} />
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Step 2: Rule form (simple)
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          {/* Header with back button */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            {!isEditing && (
              <IconButton onClick={() => setRuleType(null)} size="small" sx={{ ml: -1 }}>
                <Iconify icon="eva:arrow-back-fill" />
              </IconButton>
            )}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${RULE_COLOR}15`,
              }}
            >
              <Iconify icon={currentType?.icon} width={20} sx={{ color: RULE_COLOR }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {currentType?.label}
            </Typography>
          </Stack>

          <Stack spacing={2.5}>
            {/* Rule Text */}
            <TextField
              fullWidth
              label="Regra"
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
              placeholder={currentType?.placeholder}
              multiline
              rows={8}
              required
              autoFocus
            />

            {/* Trigger - inline chips */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Quando aplicar
              </Typography>
              <Stack direction="row" spacing={1}>
                {TRIGGERS.map((t) => (
                  <Box
                    key={t.id}
                    onClick={() => setTrigger(t.id)}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: trigger === t.id ? RULE_COLOR : 'divider',
                      bgcolor: trigger === t.id ? `${RULE_COLOR}10` : 'transparent',
                      color: trigger === t.id ? RULE_COLOR : 'text.secondary',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: trigger === t.id ? 600 : 400,
                      transition: 'all 0.15s',
                      '&:hover': {
                        borderColor: RULE_COLOR,
                      },
                    }}
                  >
                    {t.label}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !ruleText.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{
              bgcolor: RULE_COLOR,
              '&:hover': { bgcolor: RULE_COLOR, filter: 'brightness(0.9)' },
            }}
          >
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
