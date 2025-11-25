import { memo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useAgentForm } from '../agent-form-context';

// ----------------------------------------------------------------------

export const IdentitySection = memo(() => {
  const { name, description, template, setField } = useAgentForm();

  const templateInfo = agentSchemas.templates.find((t) => t.id === template) || agentSchemas.templates[7];

  return (
    <Stack spacing={2.5}>
      <TextField
        fullWidth
        label="Nome do Agente"
        value={name}
        onChange={(e) => setField('name', e.target.value)}
        required
        placeholder="Ex: Nina, Max, Sofia..."
        size="small"
      />

      <TextField
        fullWidth
        label="Descrição"
        value={description}
        onChange={(e) => setField('description', e.target.value)}
        multiline
        rows={2}
        placeholder="Descreva o propósito deste agente..."
        size="small"
      />

      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: `${templateInfo.color}08`,
          border: '1px solid',
          borderColor: `${templateInfo.color}30`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${templateInfo.color}15`,
            }}
          >
            <Iconify icon={templateInfo.icon} sx={{ color: templateInfo.color }} />
          </Box>
          <Box>
            <Typography variant="subtitle2">{templateInfo.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {templateInfo.description}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
});
