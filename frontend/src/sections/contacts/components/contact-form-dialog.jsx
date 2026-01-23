import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const FIELD_TYPE_COMPONENTS = {
  text: TextField,
  number: TextField,
  phone: TextField,
  email: TextField,
  date: TextField,
  select: 'select',
  multi: 'multi',
  boolean: 'boolean',
};

// ----------------------------------------------------------------------

export function ContactFormDialog({ open, contact, fields, onClose, onSave }) {
  const isNew = !contact?.id;
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    data: {},
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contact?.id) {
      setFormData({
        name: contact.name || '',
        phone: contact.phone || '',
        email: contact.email || '',
        notes: contact.notes || '',
        data: contact.data || {},
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        notes: '',
        data: {},
      });
    }
  }, [contact]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleDataChange = (fieldKey) => (event) => {
    setFormData((prev) => ({
      ...prev,
      data: { ...prev.data, [fieldKey]: event.target.value },
    }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save contact:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderFieldInput = (field) => {
    const value = formData.data[field.key] || '';

    if (field.field_type === 'select' && field.options?.length) {
      return (
        <FormControl key={field.key} fullWidth size="small">
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value}
            label={field.label}
            onChange={handleDataChange(field.key)}
          >
            <MenuItem value="">
              <em>Nenhum</em>
            </MenuItem>
            {field.options.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (field.field_type === 'boolean') {
      return (
        <FormControl key={field.key} fullWidth size="small">
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value}
            label={field.label}
            onChange={handleDataChange(field.key)}
          >
            <MenuItem value="">
              <em>Nenhum</em>
            </MenuItem>
            <MenuItem value="true">Sim</MenuItem>
            <MenuItem value="false">Não</MenuItem>
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        key={field.key}
        label={field.label}
        value={value}
        onChange={handleDataChange(field.key)}
        fullWidth
        size="small"
        type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
        InputLabelProps={field.field_type === 'date' ? { shrink: true } : undefined}
        helperText={field.description}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Iconify icon={isNew ? 'solar:user-plus-bold' : 'solar:pen-bold'} />
        {isNew ? 'Novo Contato' : 'Editar Contato'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {/* Core fields */}
          <TextField
            label="Nome"
            value={formData.name}
            onChange={handleChange('name')}
            fullWidth
            required
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Telefone"
              value={formData.phone}
              onChange={handleChange('phone')}
              fullWidth
              placeholder="(11) 99999-9999"
            />
            <TextField
              label="Email"
              value={formData.email}
              onChange={handleChange('email')}
              fullWidth
              type="email"
            />
          </Stack>

          {/* Custom fields */}
          {fields.length > 0 && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Iconify icon="solar:document-bold" width={18} />
                Dados Adicionais
              </Typography>

              <Stack spacing={2}>
                {fields.map((field) => renderFieldInput(field))}
              </Stack>
            </Box>
          )}

          {/* Notes */}
          <TextField
            label="Notas"
            value={formData.notes}
            onChange={handleChange('notes')}
            fullWidth
            multiline
            rows={3}
            placeholder="Observacoes sobre este contato..."
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !formData.name}
          startIcon={saving && <CircularProgress size={16} />}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ContactFormDialog.propTypes = {
  open: PropTypes.bool,
  contact: PropTypes.shape({}),
  fields: PropTypes.arrayOf(PropTypes.shape({})),
  onClose: PropTypes.func,
  onSave: PropTypes.func,
};

ContactFormDialog.defaultProps = {
  fields: [],
};
