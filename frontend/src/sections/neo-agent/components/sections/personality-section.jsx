import { memo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useFormField, useFormActions } from '../agent-form-context';

// ----------------------------------------------------------------------

export const PersonalitySection = memo(() => {
  const tone = useFormField('tone');
  const formality = useFormField('formality');
  const selectedTraits = useFormField('selectedTraits');
  const emojiUsage = useFormField('emojiUsage');
  const responseStyle = useFormField('responseStyle');
  const language = useFormField('language');
  const maxMessages = useFormField('maxMessages');
  const maxResponseLength = useFormField('maxResponseLength');
  const customInstructions = useFormField('customInstructions');
  const { setField, toggleInArray } = useFormActions();

  return (
    <Stack spacing={3}>
      {/* Tone */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Tom de Voz
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {agentSchemas.personalityOptions.tones.map((t) => (
            <Box
              key={t.id}
              onClick={() => setField('tone', t.id)}
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 2,
                cursor: 'pointer',
                textAlign: 'center',
                minWidth: 90,
                border: '1px solid',
                borderColor: tone === t.id ? 'primary.main' : 'grey.200',
                bgcolor: tone === t.id ? 'primary.lighter' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light', bgcolor: 'grey.50' },
              }}
            >
              <Iconify
                icon={t.icon}
                width={24}
                sx={{ color: tone === t.id ? 'primary.main' : 'text.secondary', mb: 0.5 }}
              />
              <Typography
                variant="caption"
                sx={{ display: 'block', fontWeight: tone === t.id ? 600 : 400 }}
              >
                {t.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Formality */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Formalidade
        </Typography>
        <Stack spacing={1}>
          {agentSchemas.personalityOptions.formalities.map((f) => (
            <Box
              key={f.id}
              onClick={() => setField('formality', f.id)}
              sx={{
                p: 2,
                borderRadius: 2,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: formality === f.id ? 'primary.main' : 'grey.200',
                bgcolor: formality === f.id ? 'primary.lighter' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2">{f.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {f.description}
                  </Typography>
                </Box>
                {formality === f.id && (
                  <Iconify icon="eva:checkmark-circle-2-fill" sx={{ color: 'primary.main' }} />
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Traits */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Traços de Personalidade
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {agentSchemas.personalityOptions.traits.map((trait) => (
            <Chip
              key={trait.id}
              label={trait.label}
              icon={<Iconify icon={trait.icon} width={16} />}
              onClick={() => toggleInArray('selectedTraits', trait.id)}
              variant={selectedTraits.includes(trait.id) ? 'filled' : 'outlined'}
              color={selectedTraits.includes(trait.id) ? 'primary' : 'default'}
              sx={{ '& .MuiChip-icon': { color: 'inherit' } }}
            />
          ))}
        </Box>
      </Box>

      {/* Response Style */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Estilo de Resposta
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {agentSchemas.personalityOptions.responseStyles.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              onClick={() => setField('responseStyle', s.id)}
              variant={responseStyle === s.id ? 'filled' : 'outlined'}
              color={responseStyle === s.id ? 'primary' : 'default'}
            />
          ))}
        </Stack>
      </Box>

      {/* Emoji Usage */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Uso de Emojis
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {agentSchemas.personalityOptions.emojiUsages.map((e) => (
            <Chip
              key={e.id}
              label={e.label}
              onClick={() => setField('emojiUsage', e.id)}
              variant={emojiUsage === e.id ? 'filled' : 'outlined'}
              color={emojiUsage === e.id ? 'primary' : 'default'}
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
          {agentSchemas.personalityOptions.languages.map((l) => (
            <Chip
              key={l.id}
              label={l.label}
              icon={<Iconify icon={l.icon} width={16} />}
              onClick={() => setField('language', l.id)}
              variant={language === l.id ? 'filled' : 'outlined'}
              color={language === l.id ? 'primary' : 'default'}
              sx={{ '& .MuiChip-icon': { color: 'inherit' } }}
            />
          ))}
        </Stack>
      </Box>

      {/* Sliders */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Máximo de Mensagens
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Divide respostas longas em múltiplas mensagens
        </Typography>
        <Stack direction="row" alignItems="center" spacing={3}>
          <Slider
            value={maxMessages}
            onChange={(e, v) => setField('maxMessages', v)}
            min={1}
            max={6}
            step={1}
            marks
            sx={{ flex: 1 }}
          />
          <Typography variant="body2" sx={{ minWidth: 80 }}>
            {maxMessages} msg
          </Typography>
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Tamanho Máximo
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Limite de caracteres por resposta
        </Typography>
        <Stack direction="row" alignItems="center" spacing={3}>
          <Slider
            value={maxResponseLength}
            onChange={(e, v) => setField('maxResponseLength', v)}
            min={50}
            max={800}
            step={50}
            sx={{ flex: 1 }}
          />
          <Typography variant="body2" sx={{ minWidth: 80 }}>
            ~{maxResponseLength}
          </Typography>
        </Stack>
      </Box>

      {/* Custom Instructions */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Instruções Personalizadas
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          size="small"
          value={customInstructions}
          onChange={(e) => setField('customInstructions', e.target.value)}
          placeholder="Instruções adicionais em linguagem natural..."
        />
      </Box>
    </Stack>
  );
});
