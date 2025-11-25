import { memo } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useAgentForm } from './agent-form-context';

// ----------------------------------------------------------------------

export const ChatPreview = memo(() => {
  const { template } = useAgentForm();

  const templateInfo = agentSchemas.templates.find((t) => t.id === template) || agentSchemas.templates[7];

  return (
    <Paper
      elevation={0}
      sx={{
        width: 380,
        height: 'calc(100vh - 220px)',
        maxHeight: 700,
        minHeight: 500,
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'grey.300',
      }}
    >

      {/* Chat area - empty, full space */}
      <Box
        sx={{
          flex: 1,
          bgcolor: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Iconify
          icon="solar:chat-dots-linear"
          width={48}
          sx={{ color: 'grey.300' }}
        />
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
