import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useContactFields, useContactFieldActions } from './hooks/use-contact-fields';

// ----------------------------------------------------------------------

const FIELD_TYPES = [
  { value: 'text', label: 'Texto', icon: 'solar:text-bold' },
  { value: 'number', label: 'Numero', icon: 'solar:calculator-bold' },
  { value: 'select', label: 'Selecao', icon: 'solar:list-bold' },
  { value: 'multi', label: 'Multipla Escolha', icon: 'solar:checklist-bold' },
  { value: 'date', label: 'Data', icon: 'solar:calendar-bold' },
  { value: 'boolean', label: 'Sim/Nao', icon: 'solar:check-circle-bold' },
  { value: 'phone', label: 'Telefone', icon: 'solar:phone-bold' },
  { value: 'email', label: 'Email', icon: 'solar:letter-bold' },
];

const DEFAULT_ICONS = [
  'solar:money-bag-bold',
  'solar:home-bold',
  'solar:buildings-bold',
  'solar:calendar-bold',
  'solar:user-bold',
  'solar:heart-bold',
  'solar:star-bold',
  'solar:tag-bold',
  'solar:box-bold',
  'solar:map-point-bold',
];

// ----------------------------------------------------------------------

export function ContactFieldsView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState(null);

  const { fields, isLoading, mutate } = useContactFields();
  const { createField, updateField, deleteField } = useContactFieldActions();

  const handleCreate = useCallback(() => {
    setSelectedField(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((field) => {
    setSelectedField(field);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (field) => {
      if (!window.confirm(`Excluir o campo "${field.label}"?`)) return;
      try {
        await deleteField(field.id);
        mutate();
      } catch (error) {
        console.error('Failed to delete field:', error);
      }
    },
    [deleteField, mutate]
  );

  const handleSave = useCallback(
    async (formData) => {
      if (selectedField?.id) {
        await updateField(selectedField.id, formData);
      } else {
        await createField(formData);
      }
      mutate();
    },
    [selectedField, createField, updateField, mutate]
  );

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedField(null);
  }, []);

  const getFieldTypeConfig = (type) => FIELD_TYPES.find((t) => t.value === type) || FIELD_TYPES[0];

  return (
    <DashboardContent maxWidth="lg">
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton component={RouterLink} href={paths.dashboard.contacts.root}>
            <Iconify icon="eva:chevron-left-fill" />
          </IconButton>
          <Box>
            <Typography variant="h4">Campos de Contato</Typography>
            <Typography variant="body2" color="text.secondary">
              Defina quais dados podem ser coletados sobre seus contatos
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          onClick={handleCreate}
        >
          Novo Campo
        </Button>
      </Stack>

      {/* Info card */}
      <Card sx={{ p: 2, mb: 3, bgcolor: (theme) => alpha(theme.palette.info.main, 0.08) }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Iconify icon="solar:info-circle-bold" width={24} sx={{ color: 'info.main' }} />
          <Box>
            <Typography variant="subtitle2" color="info.dark">
              Como funciona
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Os campos definidos aqui ficam disponiveis para todos os agentes coletarem.
              Cada agente pode ser configurado para coletar campos especificos.
            </Typography>
          </Box>
        </Stack>
      </Card>

      {/* Fields list */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : fields.length === 0 ? (
        <Card
          sx={{
            py: 8,
            textAlign: 'center',
            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
          }}
        >
          <Iconify
            icon="solar:document-add-bold-duotone"
            width={64}
            sx={{ color: 'text.disabled', mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum campo definido
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            Crie campos para coletar informacoes sobre seus contatos
          </Typography>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={handleCreate}
          >
            Criar Primeiro Campo
          </Button>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {fields.map((field, index) => {
            const typeConfig = getFieldTypeConfig(field.field_type);
            return (
              <Card
                key={field.id}
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: (theme) => theme.shadows[4],
                  },
                }}
                onClick={() => handleEdit(field)}
              >
                {/* Drag handle / order */}
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                    bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {index + 1}
                </Box>

                {/* Icon */}
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                  }}
                >
                  <Iconify icon={field.icon || typeConfig.icon} width={24} />
                </Box>

                {/* Info */}
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2">{field.label}</Typography>
                    <Chip label={typeConfig.label} size="small" variant="outlined" />
                    {field.options?.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {field.options.length} opcoes
                      </Typography>
                    )}
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      {field.key}
                    </Typography>
                    {field.description && (
                      <Typography variant="caption" color="text.disabled">
                        - {field.description}
                      </Typography>
                    )}
                  </Stack>
                </Box>

                {/* Visibility badges */}
                <Stack direction="row" spacing={0.5}>
                  {field.show_in_list && (
                    <Chip label="Lista" size="small" variant="soft" color="info" />
                  )}
                  {field.show_in_card && (
                    <Chip label="Card" size="small" variant="soft" color="success" />
                  )}
                </Stack>

                {/* Delete */}
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(field);
                  }}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                </IconButton>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Field dialog */}
      <FieldDialog
        open={dialogOpen}
        field={selectedField}
        onClose={handleCloseDialog}
        onSave={handleSave}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function FieldDialog({ open, field, onClose, onSave }) {
  const isNew = !field?.id;
  const [formData, setFormData] = useState({
    key: '',
    label: '',
    field_type: 'text',
    description: '',
    options: [],
    icon: '',
    show_in_list: true,
    show_in_card: true,
  });
  const [optionsText, setOptionsText] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (field?.id) {
      setFormData({
        key: field.key || '',
        label: field.label || '',
        field_type: field.field_type || 'text',
        description: field.description || '',
        options: field.options || [],
        icon: field.icon || '',
        show_in_list: field.show_in_list ?? true,
        show_in_card: field.show_in_card ?? true,
      });
      setOptionsText((field.options || []).join('\n'));
    } else {
      setFormData({
        key: '',
        label: '',
        field_type: 'text',
        description: '',
        options: [],
        icon: '',
        show_in_list: true,
        show_in_card: true,
      });
      setOptionsText('');
    }
  }, [field]);

  const handleChange = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate key from label
    if (name === 'label' && isNew) {
      const key = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      setFormData((prev) => ({ ...prev, key }));
    }
  };

  const handleOptionsChange = (event) => {
    setOptionsText(event.target.value);
    const options = event.target.value
      .split('\n')
      .map((o) => o.trim())
      .filter((o) => o);
    setFormData((prev) => ({ ...prev, options }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save field:', error);
    } finally {
      setSaving(false);
    }
  };

  const needsOptions = ['select', 'multi'].includes(formData.field_type);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Iconify icon={isNew ? 'solar:add-circle-bold' : 'solar:pen-bold'} />
        {isNew ? 'Novo Campo' : 'Editar Campo'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Nome do Campo"
            value={formData.label}
            onChange={handleChange('label')}
            fullWidth
            required
            placeholder="Ex: Orcamento, Quartos, Data de Nascimento"
          />

          <TextField
            label="Chave (ID)"
            value={formData.key}
            onChange={handleChange('key')}
            fullWidth
            required
            disabled={!isNew}
            helperText="Identificador unico usado internamente"
            placeholder="Ex: budget, bedrooms, birth_date"
          />

          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={formData.field_type}
              label="Tipo"
              onChange={handleChange('field_type')}
            >
              {FIELD_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon={type.icon} width={18} />
                    <span>{type.label}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {needsOptions && (
            <TextField
              label="Opcoes"
              value={optionsText}
              onChange={handleOptionsChange}
              fullWidth
              multiline
              rows={4}
              placeholder="Uma opcao por linha"
              helperText={`${formData.options.length} opcoes definidas`}
            />
          )}

          <TextField
            label="Descricao (opcional)"
            value={formData.description}
            onChange={handleChange('description')}
            fullWidth
            placeholder="Texto de ajuda para este campo"
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Icone (opcional)
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {DEFAULT_ICONS.map((icon) => (
                <IconButton
                  key={icon}
                  onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                  sx={{
                    border: (theme) =>
                      formData.icon === icon
                        ? `2px solid ${theme.palette.primary.main}`
                        : '2px solid transparent',
                    borderRadius: 1,
                  }}
                >
                  <Iconify icon={icon} width={20} />
                </IconButton>
              ))}
            </Stack>
          </Box>

          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.show_in_list}
                  onChange={handleChange('show_in_list')}
                />
              }
              label="Mostrar na lista"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.show_in_card}
                  onChange={handleChange('show_in_card')}
                />
              }
              label="Mostrar no card"
            />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !formData.key || !formData.label}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
