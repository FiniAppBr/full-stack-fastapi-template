import { memo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useFormField, useFormActions } from '../agent-form-context';

// ----------------------------------------------------------------------

const ICON_OPTIONS = [
  'solar:settings-bold-duotone',
  'solar:chat-round-dots-bold-duotone',
  'solar:user-bold-duotone',
  'solar:star-bold-duotone',
  'solar:bolt-bold-duotone',
  'solar:heart-bold-duotone',
  'solar:shield-bold-duotone',
  'solar:lightbulb-bold-duotone',
  'solar:rocket-bold-duotone',
  'solar:magic-stick-bold-duotone',
  'solar:hand-shake-bold-duotone',
  'solar:diploma-bold-duotone',
];

const COLOR_OPTIONS = [
  '#64748B', '#3B82F6', '#8B5CF6', '#EC4899',
  '#EF4444', '#F59E0B', '#22C55E', '#06B6D4',
];

export const IdentitySection = memo(() => {
  const name = useFormField('name');
  const description = useFormField('description');
  const template = useFormField('template');
  const customIcon = useFormField('customIcon');
  const customColor = useFormField('customColor');
  const customTag = useFormField('customTag');
  const { setField } = useFormActions();

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const templateInfo = agentSchemas.templates.find((t) => t.id === template) || agentSchemas.templates[7];
  const isCustom = template === 'custom';

  // Effective values: use custom fields if set, otherwise template defaults
  const effectiveIcon = customIcon || templateInfo.icon;
  const effectiveColor = customColor || templateInfo.color;
  const effectiveTag = customTag || templateInfo.name;

  const handleEditDescription = () => {
    // Convert to custom and preserve current values
    if (!isCustom) {
      // Preserve icon/color/tag from template BEFORE switching to custom
      setField('customIcon', customIcon || templateInfo.icon);
      setField('customColor', customColor || templateInfo.color);
      setField('customTag', customTag || templateInfo.name);
      setField('description', templateInfo.systemPrompt || '');
      setField('template', 'custom');
    }
  };

  const handleTemplateSelect = (t) => {
    setField('template', t.id);
    // Set description to template's systemPrompt (or empty for custom)
    setField('description', t.systemPrompt || '');
    // Reset custom fields when selecting a template (will use template defaults)
    if (t.id !== 'custom') {
      setField('customIcon', '');
      setField('customColor', '');
      setField('customTag', '');
    }
    setTemplatePickerOpen(false);
  };

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

      {/* Icon + Color + Tag row - always visible */}
      <Stack direction="row" spacing={1.5}>
        {/* Icon picker */}
        <Box
          onClick={() => setIconPickerOpen(true)}
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: `${effectiveColor}15`,
            border: '1px solid',
            borderColor: `${effectiveColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: effectiveColor,
            },
          }}
        >
          <Iconify icon={effectiveIcon} width={26} sx={{ color: effectiveColor }} />
        </Box>

        {/* Color picker */}
        <Box
          onClick={() => setColorPickerOpen(true)}
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: effectiveColor,
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              opacity: 0.8,
            },
          }}
        />

        {/* Tag input */}
        <TextField
          sx={{ flex: 1 }}
          label="Tag"
          value={effectiveTag}
          onChange={(e) => setField('customTag', e.target.value)}
          size="small"
        />
      </Stack>

      {/* Archetype card with identity */}
      <Box
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: `${effectiveColor}30`,
          overflow: 'hidden',
        }}
      >
        {/* Header - clickable to change archetype */}
        <Box
          onClick={() => setTemplatePickerOpen(true)}
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: `${effectiveColor}08`,
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: `${effectiveColor}15`,
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2" sx={{ color: effectiveColor }}>
                {templateInfo.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {templateInfo.description}
              </Typography>
            </Box>
            <Iconify icon="eva:chevron-right-fill" sx={{ color: 'text.secondary' }} />
          </Stack>
        </Box>

        {/* Identity content */}
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <TextField
              fullWidth
              value={description || templateInfo.systemPrompt}
              onChange={(e) => {
                if (e.target.value.length > 500) return;
                if (!isCustom) handleEditDescription();
                setField('description', e.target.value);
              }}
              multiline
              minRows={2}
              size="small"
              placeholder="Descreva a identidade e comportamento do agente..."
              helperText={`${(description || templateInfo.systemPrompt).length}/500`}
              FormHelperTextProps={{ sx: { textAlign: 'right', mr: 0 } }}
              inputProps={{
                spellCheck: false,
                autoCorrect: 'off',
                autoCapitalize: 'off',
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: 'transparent' },
                  '&.Mui-focused fieldset': { borderColor: 'transparent' },
                },
              }}
            />
          </Stack>
        </Box>
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
          <Stack spacing={1} sx={{ pt: 1, pb: 2 }}>
            {agentSchemas.templates.map((t) => (
              <Box
                key={t.id}
                onClick={() => handleTemplateSelect(t)}
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

      {/* Icon Picker Dialog */}
      <Dialog
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Escolher Ícone</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 1, pb: 2 }}>
            {ICON_OPTIONS.map((icon) => (
              <Box
                key={icon}
                onClick={() => {
                  setField('customIcon', icon);
                  setIconPickerOpen(false);
                }}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: (customIcon || templateInfo.icon) === icon ? effectiveColor : 'grey.200',
                  bgcolor: (customIcon || templateInfo.icon) === icon ? `${effectiveColor}15` : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: effectiveColor,
                    bgcolor: `${effectiveColor}08`,
                  },
                }}
              >
                <Iconify icon={icon} width={24} sx={{ color: effectiveColor }} />
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Color Picker Dialog */}
      <Dialog
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        maxWidth="xs"
      >
        <DialogTitle>Escolher Cor</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 1, pb: 2 }}>
            {COLOR_OPTIONS.map((color) => (
              <Box
                key={color}
                onClick={() => {
                  setField('customColor', color);
                  setColorPickerOpen(false);
                }}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.5,
                  bgcolor: color,
                  cursor: 'pointer',
                  border: '3px solid',
                  borderColor: effectiveColor === color ? 'common.white' : 'transparent',
                  boxShadow: effectiveColor === color ? `0 0 0 2px ${color}` : 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                }}
              />
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
});
