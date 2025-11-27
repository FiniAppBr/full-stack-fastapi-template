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

// Situation color (all situations are orange)
const SITUATION_COLOR = '#F97316';

// Situation types
const SITUATION_TYPES = [
  {
    id: 'objection',
    category: 'objections',
    label: 'Objeção',
    icon: 'solar:shield-minimalistic-bold',
    description: 'Cliente resiste ou tem dúvidas',
    examples: '"Tá caro", "Vou pensar", "Não tenho tempo"',
    triggerPlaceholder: 'Ex: Cliente diz que está caro',
    responsePlaceholder: 'Ex: Validar a preocupação, mostrar o valor do investimento, oferecer opções de pagamento',
  },
  {
    id: 'specific_case',
    category: 'specific_cases',
    label: 'Caso Específico',
    icon: 'solar:flag-bold',
    description: 'Situações que precisam de tratamento especial',
    examples: 'Cliente ansioso, alergia severa, pedido complexo',
    triggerPlaceholder: 'Ex: Cliente menciona que tem alergia severa',
    responsePlaceholder: 'Ex: Recomendar que ligue para falar diretamente com o responsável antes de agendar',
  },
  {
    id: 'faq',
    category: 'faq',
    label: 'Pergunta Frequente',
    icon: 'solar:question-circle-bold',
    description: 'Dúvidas comuns dos clientes',
    examples: 'Garantia, prazo, formas de pagamento',
    triggerPlaceholder: 'Ex: Cliente pergunta sobre a garantia',
    responsePlaceholder: 'Ex: Explicar que oferecemos garantia de 7 dias, e que ele pode solicitar reembolso sem burocracia',
  },
];

export function SituationFormModal({
  open,
  onClose,
  onSave,
  entity = null,
  loading = false,
}) {
  const isEditing = Boolean(entity);

  // Wizard state
  const [step, setStep] = useState(1);
  const [situationType, setSituationType] = useState(null);
  const [trigger, setTrigger] = useState('');
  const [response, setResponse] = useState('');

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (isEditing && entity) {
        // Find type from category
        const type = SITUATION_TYPES.find((t) => t.category === entity.category) || SITUATION_TYPES[0];
        setSituationType(type);
        setTrigger(entity.data?.trigger || entity.name || '');
        setResponse(entity.data?.response || '');
        setStep(2); // Skip type selection when editing
      } else {
        setSituationType(null);
        setTrigger('');
        setResponse('');
        setStep(1);
      }
    }
  }, [open, isEditing, entity]);

  const handleSelectType = (type) => {
    setSituationType(type);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2 && !isEditing) {
      setStep(1);
      setSituationType(null);
    }
  };

  const handleNext = () => {
    if (step === 2 && trigger.trim()) {
      setStep(3);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: entity?.id,
      name: trigger.trim(), // Use trigger as name
      category: situationType.category,
      template: situationType.id,
      data: {
        trigger: trigger.trim(),
        response: response.trim(),
      },
      description: null,
      capabilities: [],
    });
  };

  // Step 1: Type picker
  if (step === 1) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Tipo de situação
          </Typography>
          <Stack spacing={1.5}>
            {SITUATION_TYPES.map((type) => (
              <Box
                key={type.id}
                onClick={() => handleSelectType(type)}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  transition: 'all 0.15s',
                  '&:hover': {
                    borderColor: SITUATION_COLOR,
                    bgcolor: `${SITUATION_COLOR}08`,
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
                    bgcolor: `${SITUATION_COLOR}15`,
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon={type.icon} width={22} sx={{ color: SITUATION_COLOR }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">{type.label}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {type.description}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                    {type.examples}
                  </Typography>
                </Box>
                <Iconify icon="eva:chevron-right-fill" sx={{ color: 'text.disabled', mt: 1 }} />
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

  // Step 2: Trigger
  if (step === 2) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            {!isEditing && (
              <IconButton onClick={handleBack} size="small" sx={{ ml: -1 }}>
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
                bgcolor: `${SITUATION_COLOR}15`,
              }}
            >
              <Iconify icon={situationType?.icon} width={20} sx={{ color: SITUATION_COLOR }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {situationType?.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Passo 1 de 2: Quando acontece?
              </Typography>
            </Box>
          </Stack>

          {/* Trigger input */}
          <TextField
            fullWidth
            label="Quando isso acontece?"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder={situationType?.triggerPlaceholder}
            multiline
            rows={3}
            autoFocus
            helperText="Descreva a situação ou o que o cliente diz/faz"
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!trigger.trim()}
            endIcon={<Iconify icon="eva:arrow-forward-fill" />}
            sx={{
              bgcolor: SITUATION_COLOR,
              '&:hover': { bgcolor: SITUATION_COLOR, filter: 'brightness(0.9)' },
            }}
          >
            Próximo
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Step 3: Response
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <IconButton onClick={handleBack} size="small" sx={{ ml: -1 }}>
              <Iconify icon="eva:arrow-back-fill" />
            </IconButton>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${SITUATION_COLOR}15`,
              }}
            >
              <Iconify icon={situationType?.icon} width={20} sx={{ color: SITUATION_COLOR }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {situationType?.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Passo 2 de 2: Como responder?
              </Typography>
            </Box>
          </Stack>

          {/* Show trigger as context */}
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 1.5,
              bgcolor: 'background.neutral',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Quando acontece:
            </Typography>
            <Typography variant="body2">{trigger}</Typography>
          </Box>

          {/* Response input */}
          <TextField
            fullWidth
            label="Como o agente deve responder?"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={situationType?.responsePlaceholder}
            multiline
            rows={4}
            required
            autoFocus
            helperText="Descreva o comportamento, argumentos ou informações que o agente deve usar"
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !response.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{
              bgcolor: SITUATION_COLOR,
              '&:hover': { bgcolor: SITUATION_COLOR, filter: 'brightness(0.9)' },
            }}
          >
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
