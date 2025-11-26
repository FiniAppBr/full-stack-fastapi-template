import { memo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useFormField, useFormActions } from '../agent-form-context';

// ----------------------------------------------------------------------

export const IdentitySection = memo(() => {
  const name = useFormField('name');
  const description = useFormField('description');
  const template = useFormField('template');
  const { setField } = useFormActions();

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);

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

      {/* Description with fullscreen button */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Descrição
          </Typography>
          <IconButton
            size="small"
            onClick={() => setDescriptionDialogOpen(true)}
            sx={{ color: 'text.secondary' }}
          >
            <Iconify icon="solar:full-screen-bold" width={16} />
          </IconButton>
        </Stack>
        <TextField
          fullWidth
          value={description}
          onChange={(e) => setField('description', e.target.value)}
          multiline
          rows={4}
          placeholder="Descreva o propósito deste agente..."
          size="small"
        />
      </Box>

      {/* Template selector */}
      <Box
        onClick={() => setTemplatePickerOpen(true)}
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: `${templateInfo.color}08`,
          border: '1px solid',
          borderColor: `${templateInfo.color}30`,
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: `${templateInfo.color}12`,
            borderColor: `${templateInfo.color}50`,
          },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
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
          <Iconify icon="eva:chevron-right-fill" sx={{ color: 'text.secondary' }} />
        </Stack>
      </Box>

      {/* Template Picker Dialog */}
      <Dialog
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Escolher Arquétipo</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ pt: 1 }}>
            {agentSchemas.templates.map((t) => (
              <Box
                key={t.id}
                onClick={() => {
                  setField('template', t.id);
                  setTemplatePickerOpen(false);
                }}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: template === t.id ? t.color : 'grey.200',
                  bgcolor: template === t.id ? `${t.color}08` : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: t.color,
                    bgcolor: `${t.color}05`,
                  },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${t.color}15`,
                    }}
                  >
                    <Iconify icon={t.icon} width={22} sx={{ color: t.color }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">{t.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.description}
                    </Typography>
                  </Box>
                  {template === t.id && (
                    <Iconify icon="eva:checkmark-circle-2-fill" sx={{ color: t.color }} />
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Description Fullscreen Dialog */}
      <Dialog
        open={descriptionDialogOpen}
        onClose={() => setDescriptionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Descrição do Agente</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            value={description}
            onChange={(e) => setField('description', e.target.value)}
            multiline
            rows={12}
            placeholder="Descreva o propósito deste agente em detalhes..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescriptionDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
});
