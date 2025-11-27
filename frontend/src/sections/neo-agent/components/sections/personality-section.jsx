import { memo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import { useFormField, useFormActions } from '../agent-form-context';

// ----------------------------------------------------------------------

const MESSAGE_STYLES = [
  {
    id: 'direct',
    label: 'Direto',
    description: 'Respostas concisas e objetivas',
    icon: 'solar:bolt-bold',
    minMessages: 1,
    maxMessages: 2,
    maxResponseLength: 100,
    bubbles: [
      { width: '70%', lines: 1 },
    ],
  },
  {
    id: 'natural',
    label: 'Natural',
    description: 'Equilibrado, como uma conversa real',
    icon: 'solar:chat-round-dots-bold',
    minMessages: 2,
    maxMessages: 4,
    maxResponseLength: 200,
    bubbles: [
      { width: '65%', lines: 1 },
      { width: '80%', lines: 2 },
    ],
  },
  {
    id: 'detailed',
    label: 'Detalhado',
    description: 'Respostas completas e informativas',
    icon: 'solar:document-text-bold',
    minMessages: 3,
    maxMessages: 6,
    maxResponseLength: 400,
    bubbles: [
      { width: '60%', lines: 1 },
      { width: '85%', lines: 2 },
      { width: '70%', lines: 1 },
    ],
  },
];

// ----------------------------------------------------------------------

const MockBubble = memo(({ width, lines, isSelected }) => (
  <Box
    sx={{
      width,
      borderRadius: 1.5,
      bgcolor: isSelected ? 'primary.main' : 'grey.300',
      p: 1,
      transition: 'all 0.2s ease',
    }}
  >
    {Array.from({ length: lines }).map((_, i) => (
      <Box
        key={i}
        sx={{
          height: 6,
          borderRadius: 0.5,
          bgcolor: isSelected ? alpha('#fff', 0.4) : 'grey.400',
          mb: i < lines - 1 ? 0.5 : 0,
          width: i === lines - 1 && lines > 1 ? '60%' : '100%',
          transition: 'all 0.2s ease',
        }}
      />
    ))}
  </Box>
));

// ----------------------------------------------------------------------

const StyleCard = memo(({ style, isSelected, onSelect }) => (
  <Box
    onClick={onSelect}
    sx={{
      flex: 1,
      p: 2,
      borderRadius: 2,
      cursor: 'pointer',
      border: '2px solid',
      borderColor: isSelected ? 'primary.main' : 'grey.200',
      bgcolor: isSelected ? alpha('#1976d2', 0.04) : 'background.paper',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: isSelected ? 'primary.main' : 'grey.300',
        bgcolor: isSelected ? alpha('#1976d2', 0.04) : 'grey.50',
        transform: 'translateY(-2px)',
      },
    }}
  >
    {/* Mock Chat Preview */}
    <Box
      sx={{
        mb: 2,
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: isSelected ? alpha('#1976d2', 0.08) : 'grey.100',
        minHeight: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0.75,
        transition: 'all 0.2s ease',
      }}
    >
      {style.bubbles.map((bubble, idx) => (
        <MockBubble
          key={idx}
          width={bubble.width}
          lines={bubble.lines}
          isSelected={isSelected}
        />
      ))}
    </Box>

    {/* Label & Icon */}
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
      <Iconify
        icon={style.icon}
        width={18}
        sx={{
          color: isSelected ? 'primary.main' : 'text.secondary',
          transition: 'color 0.2s ease',
        }}
      />
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: isSelected ? 600 : 500,
          color: isSelected ? 'primary.main' : 'text.primary',
          transition: 'all 0.2s ease',
        }}
      >
        {style.label}
      </Typography>
    </Stack>

    {/* Description */}
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        display: 'block',
        lineHeight: 1.4,
      }}
    >
      {style.description}
    </Typography>

    {/* Stats Badge */}
    <Box
      sx={{
        mt: 2,
        pt: 1.5,
        borderTop: '1px solid',
        borderColor: isSelected ? alpha('#1976d2', 0.2) : 'grey.200',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          bgcolor: isSelected ? alpha('#1976d2', 0.12) : 'grey.100',
          border: '1px solid',
          borderColor: isSelected ? alpha('#1976d2', 0.3) : 'grey.200',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
        }}
      >
        <Iconify
          icon="solar:chat-square-bold"
          width={14}
          sx={{
            color: isSelected ? 'primary.main' : 'text.disabled',
            transition: 'color 0.2s ease',
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isSelected ? 'primary.main' : 'text.secondary',
            letterSpacing: '0.02em',
          }}
        >
          {style.minMessages}-{style.maxMessages} mensagens
        </Typography>
      </Box>
    </Box>
  </Box>
));

// ----------------------------------------------------------------------

export const PersonalitySection = memo(() => {
  const minMessages = useFormField('minMessages');
  const maxMessages = useFormField('maxMessages');
  const maxResponseLength = useFormField('maxResponseLength');
  const typingEnabled = useFormField('typingEnabled');
  const emojiUsage = useFormField('emojiUsage');
  const { setField } = useFormActions();

  // Determine which style is currently selected
  const getSelectedStyle = () => {
    const style = MESSAGE_STYLES.find(
      (s) =>
        s.minMessages === minMessages &&
        s.maxMessages === maxMessages &&
        s.maxResponseLength === maxResponseLength
    );
    return style?.id || 'natural'; // Default to natural if custom values
  };

  const selectedStyle = getSelectedStyle();

  const handleSelectStyle = (style) => {
    setField('minMessages', style.minMessages);
    setField('maxMessages', style.maxMessages);
    setField('maxResponseLength', style.maxResponseLength);
  };

  return (
    <Stack spacing={2.5}>
      {/* Subtitle */}
      <Typography variant="body2" color="text.secondary">
        Define como o agente estrutura suas respostas
      </Typography>

      {/* Style Cards */}
      <Stack direction="row" spacing={2}>
        {MESSAGE_STYLES.map((style) => (
          <StyleCard
            key={style.id}
            style={style}
            isSelected={selectedStyle === style.id}
            onSelect={() => handleSelectStyle(style)}
          />
        ))}
      </Stack>

      <Divider />

      {/* Typing + Emoji row */}
      <Stack direction="row" spacing={3}>
        {/* Typing Simulation */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Simular &quot;digitando...&quot;
          </Typography>
          <Box
            onClick={() => setField('typingEnabled', !typingEnabled)}
            sx={{
              py: 1,
              px: 1.5,
              borderRadius: 1,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: typingEnabled ? 'primary.main' : 'divider',
              bgcolor: typingEnabled ? 'primary.lighter' : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              transition: 'all 0.15s',
              '&:hover': { borderColor: 'primary.light' },
            }}
          >
            <Iconify
              icon={typingEnabled ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
              width={20}
              sx={{ color: typingEnabled ? 'primary.main' : 'text.disabled' }}
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 500,
                fontSize: '0.65rem',
                color: typingEnabled ? 'primary.main' : 'text.secondary',
              }}
            >
              {typingEnabled ? 'Ativado' : 'Desativado'}
            </Typography>
          </Box>
        </Box>

        {/* Emoji Usage */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Emojis
          </Typography>
          <Stack direction="row" spacing={1}>
            {[
              { value: 'none', label: 'Nenhum', icon: 'solar:forbidden-circle-linear' },
              { value: 'minimal', label: 'Pouco', icon: 'solar:face-scan-circle-linear' },
              { value: 'frequent', label: 'Normal', emoji: '😊' },
            ].map((opt) => (
              <Box
                key={opt.value}
                onClick={() => setField('emojiUsage', opt.value)}
                sx={{
                  flex: 1,
                  py: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: emojiUsage === opt.value ? 'primary.main' : 'divider',
                  bgcolor: emojiUsage === opt.value ? 'primary.lighter' : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: 'primary.light' },
                }}
              >
                {opt.icon ? (
                  <Iconify
                    icon={opt.icon}
                    width={20}
                    sx={{ color: emojiUsage === opt.value ? 'primary.main' : 'text.disabled' }}
                  />
                ) : (
                  <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{opt.emoji}</Typography>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.65rem',
                    color: emojiUsage === opt.value ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {opt.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Stack>
  );
});
