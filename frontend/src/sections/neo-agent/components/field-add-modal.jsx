import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const FIELD_TYPES = [
  { value: 'text', label: 'Texto', icon: 'solar:text-bold-duotone' },
  { value: 'number', label: 'Número', icon: 'solar:calculator-bold-duotone' },
  { value: 'phone', label: 'Telefone', icon: 'solar:phone-bold-duotone' },
  { value: 'email', label: 'Email', icon: 'solar:letter-bold-duotone' },
  { value: 'date', label: 'Data', icon: 'solar:calendar-bold-duotone' },
  { value: 'boolean', label: 'Sim/Não', icon: 'solar:check-circle-bold-duotone' },
  { value: 'select', label: 'Seleção', icon: 'solar:list-bold-duotone' },
  { value: 'multi', label: 'Multi-seleção', icon: 'solar:checklist-bold-duotone' },
];

const ICON_OPTIONS = [
  'solar:user-bold-duotone',
  'solar:phone-bold-duotone',
  'solar:letter-bold-duotone',
  'solar:money-bag-bold-duotone',
  'solar:calendar-bold-duotone',
  'solar:map-point-bold-duotone',
  'solar:buildings-2-bold-duotone',
  'solar:tag-bold-duotone',
  'solar:star-bold-duotone',
  'solar:heart-bold-duotone',
  'solar:cart-bold-duotone',
  'solar:document-text-bold-duotone',
];

// Slugify label to generate key
const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// Get default icon for field type
const getDefaultIcon = (fieldType) => {
  const type = FIELD_TYPES.find((t) => t.value === fieldType);
  return type?.icon || 'solar:document-text-bold-duotone';
};

// ----------------------------------------------------------------------

/**
 * Modal for adding contact fields to an agent.
 * Shows existing fields as selectable chips + inline creation form.
 */
export function FieldAddModal({
  open,
  onClose,
  availableFields = [],
  configuredFieldIds = [],
  onAddField,
  onFieldCreated,
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Creation form state
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // Fields not yet added to agent
  const selectableFields = useMemo(
    () => availableFields.filter((f) => !configuredFieldIds.has(f.id)),
    [availableFields, configuredFieldIds]
  );

  // Reset form
  const resetForm = () => {
    setLabel('');
    setFieldType('text');
    setIcon('');
    setDescription('');
    setShowCreateForm(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Add existing field
  const handleSelectField = (field) => {
    onAddField(field.id);
    handleClose();
  };

  // Create new field
  const handleCreate = async () => {
    if (!label.trim()) return;

    setCreating(true);
    try {
      const key = slugify(label);
      const payload = {
        key,
        label: label.trim(),
        field_type: fieldType,
        icon: icon || getDefaultIcon(fieldType),
        description: description.trim() || null,
      };

      const response = await axios.post(endpoints.contacts.fields, payload);
      const newField = response.data;

      // Notify parent about new field
      if (onFieldCreated) {
        onFieldCreated(newField);
      }

      // Auto-add to agent
      onAddField(newField.id);
      handleClose();
    } catch (error) {
      console.error('Failed to create field:', error);
    } finally {
      setCreating(false);
    }
  };

  const effectiveIcon = icon || getDefaultIcon(fieldType);

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Adicionar Campo</Typography>
            <IconButton onClick={handleClose} size="small">
              <Iconify icon="eva:close-fill" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {/* Existing fields section */}
          {selectableFields.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Campos existentes
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {selectableFields.map((field) => (
                  <Chip
                    key={field.id}
                    label={field.label}
                    icon={<Iconify icon={field.icon || getDefaultIcon(field.field_type)} width={16} />}
                    onClick={() => handleSelectField(field)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Divider */}
          {selectableFields.length > 0 && (
            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">
                ou
              </Typography>
            </Divider>
          )}

          {/* Create new field section */}
          {!showCreateForm ? (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={() => setShowCreateForm(true)}
              sx={{ borderStyle: 'dashed', py: 1.5 }}
            >
              Criar novo campo
            </Button>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Criar novo campo
              </Typography>

              <Stack spacing={2}>
                {/* Label */}
                <TextField
                  fullWidth
                  label="Nome do campo"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Orçamento, Preferência, Interesse..."
                  autoFocus
                />

                {/* Type + Icon row */}
                <Stack direction="row" spacing={2}>
                  {/* Field type */}
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={fieldType}
                      onChange={(e) => setFieldType(e.target.value)}
                      label="Tipo"
                    >
                      {FIELD_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Iconify icon={type.icon} width={18} sx={{ color: 'text.secondary' }} />
                            <span>{type.label}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Icon picker */}
                  <Box
                    onClick={() => setIconPickerOpen(true)}
                    sx={{
                      width: 48,
                      height: 40,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Iconify icon={effectiveIcon} width={22} sx={{ color: 'primary.main' }} />
                  </Box>
                </Stack>

                {/* Description */}
                <TextField
                  fullWidth
                  label="Descrição (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ajuda para o usuário entender o campo"
                  size="small"
                />

                {/* Actions */}
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button onClick={() => setShowCreateForm(false)} color="inherit">
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCreate}
                    disabled={creating || !label.trim()}
                    startIcon={creating ? <CircularProgress size={16} /> : null}
                  >
                    {creating ? 'Criando...' : 'Criar e Adicionar'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
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
            {ICON_OPTIONS.map((iconOption) => (
              <Box
                key={iconOption}
                onClick={() => {
                  setIcon(iconOption);
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
                  borderColor: effectiveIcon === iconOption ? 'primary.main' : 'grey.200',
                  bgcolor: effectiveIcon === iconOption ? 'primary.lighter' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Iconify icon={iconOption} width={24} sx={{ color: 'primary.main' }} />
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
