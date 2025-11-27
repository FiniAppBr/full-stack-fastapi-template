import { useMemo, useState } from 'react';

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

// Slugify label to generate key
const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// Get default icon for field type
const getDefaultIcon = (fieldType) => {
  const type = FIELD_TYPES.find((t) => t.value === fieldType);
  return type?.icon || 'solar:document-text-bold-duotone';
};

// ----------------------------------------------------------------------

/**
 * Simplified modal for adding contact fields.
 * Shows existing fields as chips + always-visible creation form.
 */
export function FieldAddModal({
  open,
  onClose,
  availableFields = [],
  configuredFieldIds = [],
  onAddField,
  onFieldCreated,
}) {
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');

  // Fields not yet added to agent
  const selectableFields = useMemo(
    () => availableFields.filter((f) => !configuredFieldIds.has(f.id)),
    [availableFields, configuredFieldIds]
  );

  const resetForm = () => {
    setLabel('');
    setFieldType('text');
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
        icon: getDefaultIcon(fieldType),
      };

      const response = await axios.post(endpoints.contacts.fields, payload);
      const newField = response.data;

      if (onFieldCreated) {
        onFieldCreated(newField);
      }

      onAddField(newField.id);
      handleClose();
    } catch (error) {
      console.error('Failed to create field:', error);
    } finally {
      setCreating(false);
    }
  };

  const hasExistingFields = selectableFields.length > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Adicionar Campo</Typography>
          <IconButton onClick={handleClose} size="small">
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* Existing fields */}
        {hasExistingFields && (
          <>
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

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">
                ou criar novo
              </Typography>
            </Divider>
          </>
        )}

        {/* Create form - always visible */}
        <Stack spacing={2}>
          <TextField
            fullWidth
            size="small"
            label="Nome do campo"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Orçamento, Interesse..."
            autoFocus={!hasExistingFields}
          />

          <FormControl size="small" fullWidth>
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

          <Button
            fullWidth
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !label.trim()}
            startIcon={creating ? <CircularProgress size={16} /> : <Iconify icon="eva:plus-fill" />}
          >
            {creating ? 'Criando...' : 'Criar Campo'}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
