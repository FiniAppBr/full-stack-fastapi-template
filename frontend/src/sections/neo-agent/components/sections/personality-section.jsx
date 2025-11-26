import { memo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useFormField, useFormActions } from '../agent-form-context';

// ----------------------------------------------------------------------

const RESPONSE_SIZES = [
  { value: 100, label: 'Curta' },
  { value: 200, label: 'Média' },
  { value: 400, label: 'Longa' },
];

export const PersonalitySection = memo(() => {
  const language = useFormField('language');
  const minMessages = useFormField('minMessages');
  const maxMessages = useFormField('maxMessages');
  const maxResponseLength = useFormField('maxResponseLength');
  const { setField } = useFormActions();

  return (
    <Stack spacing={3}>
      {/* Language */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Idioma
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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

      {/* Response Size */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Tamanho das Respostas
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Respostas mais curtas são melhores para WhatsApp
        </Typography>
        <Stack direction="row" spacing={1}>
          {RESPONSE_SIZES.map((size) => (
            <Box
              key={size.value}
              onClick={() => setField('maxResponseLength', size.value)}
              sx={{
                flex: 1,
                py: 1.5,
                borderRadius: 1,
                textAlign: 'center',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: maxResponseLength === size.value ? 'primary.main' : 'grey.300',
                bgcolor: maxResponseLength === size.value ? 'primary.lighter' : 'transparent',
                transition: 'all 0.15s',
                '&:hover': {
                  borderColor: 'primary.light',
                  bgcolor: maxResponseLength === size.value ? 'primary.lighter' : 'grey.100',
                },
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: maxResponseLength === size.value ? 600 : 400 }}
              >
                {size.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ~{size.value} chars
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Messages Range */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Mensagens por Resposta
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Mínimo e máximo de mensagens consecutivas
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Min
            </Typography>
            {[1, 2, 3].map((n) => (
              <Box
                key={n}
                onClick={() => {
                  setField('minMessages', n);
                  if (maxMessages < n) setField('maxMessages', n);
                }}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  border: '1px solid',
                  borderColor: minMessages === n ? 'primary.main' : 'grey.300',
                  bgcolor: minMessages === n ? 'primary.lighter' : 'transparent',
                  fontWeight: minMessages === n ? 600 : 400,
                  transition: 'all 0.15s',
                  '&:hover': {
                    borderColor: 'primary.light',
                    bgcolor: minMessages === n ? 'primary.lighter' : 'grey.100',
                  },
                }}
              >
                {n}
              </Box>
            ))}
          </Stack>

          <Typography color="text.disabled">—</Typography>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Max
            </Typography>
            {[2, 3, 4, 5, 6].map((n) => (
              <Box
                key={n}
                onClick={() => {
                  setField('maxMessages', n);
                  if (minMessages > n) setField('minMessages', n);
                }}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  border: '1px solid',
                  borderColor: maxMessages === n ? 'primary.main' : 'grey.300',
                  bgcolor: maxMessages === n ? 'primary.lighter' : 'transparent',
                  fontWeight: maxMessages === n ? 600 : 400,
                  opacity: n < minMessages ? 0.4 : 1,
                  pointerEvents: n < minMessages ? 'none' : 'auto',
                  transition: 'all 0.15s',
                  '&:hover': {
                    borderColor: 'primary.light',
                    bgcolor: maxMessages === n ? 'primary.lighter' : 'grey.100',
                  },
                }}
              >
                {n}
              </Box>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
});
