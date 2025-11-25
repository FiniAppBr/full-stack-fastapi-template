import { memo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useAgentForm } from './agent-form-context';

// ----------------------------------------------------------------------

export const ChatPreview = memo(() => {
  const { name, template, tone, emojiUsage, responseStyle, language } = useAgentForm();

  const templateInfo = agentSchemas.templates.find((t) => t.id === template) || agentSchemas.templates[7];
  const toneInfo = agentSchemas.personalityOptions.tones.find((t) => t.id === tone);

  // Generate a sample message based on personality
  const getSampleMessage = () => {
    const greetings = {
      friendly: 'Oi! 👋 Como posso te ajudar hoje?',
      professional: 'Olá, como posso ajudá-lo?',
      casual: 'E aí! Tudo bem? No que posso ajudar?',
      enthusiastic: 'Olá!! 🎉 Que bom te ver! Como posso ajudar?',
    };
    let msg = greetings[tone] || greetings.friendly;
    if (emojiUsage === 'none') {
      msg = msg.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    }
    return msg;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: 300,
        height: 480,
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'grey.200',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: templateInfo.color,
          color: 'white',
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton size="small" sx={{ color: 'white', opacity: 0.8 }}>
            <Iconify icon="eva:arrow-back-fill" width={18} />
          </IconButton>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'rgba(255,255,255,0.2)',
            }}
          >
            <Iconify icon={templateInfo.icon} width={18} />
          </Avatar>
          {name && (
            <Typography variant="subtitle2" sx={{ color: 'white' }}>
              {name}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" sx={{ color: 'white', opacity: 0.8 }}>
            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
          </IconButton>
          <IconButton size="small" sx={{ color: 'white', opacity: 0.8 }}>
            <Iconify icon="eva:close-fill" width={18} />
          </IconButton>
        </Stack>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, p: 2, bgcolor: '#fafafa', overflowY: 'auto' }}>
        {/* Bot Avatar */}
        <Box sx={{ display: 'flex', mb: 1.5 }}>
          <Avatar
            sx={{
              width: 28,
              height: 28,
              bgcolor: templateInfo.color,
            }}
          >
            <Iconify icon={templateInfo.icon} width={14} />
          </Avatar>
        </Box>

        {/* Welcome Message */}
        <Box
          sx={{
            maxWidth: '85%',
            bgcolor: templateInfo.color,
            color: 'white',
            borderRadius: 2,
            borderTopLeftRadius: 4,
            px: 2,
            py: 1.5,
            mb: 2,
          }}
        >
          <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            {getSampleMessage()}
          </Typography>
        </Box>

        {/* Info badges */}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 2 }}>
          {toneInfo && (
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'grey.100',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Iconify icon={toneInfo.icon} width={12} sx={{ color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {toneInfo.label}
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: 'grey.100',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {responseStyle === 'whatsapp' ? 'WhatsApp' : 'Email'}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Input */}
      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'grey.100' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Digite uma mensagem..."
          disabled
          InputProps={{
            sx: { borderRadius: 2.5, bgcolor: 'grey.50', fontSize: '0.85rem' },
            endAdornment: (
              <IconButton size="small" disabled>
                <Iconify icon="solar:plain-bold" width={18} sx={{ color: templateInfo.color }} />
              </IconButton>
            ),
          }}
        />
      </Box>
    </Paper>
  );
});
