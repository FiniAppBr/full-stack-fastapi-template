import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import axios, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const ENTITY_TYPES = [
  { value: 'product', label: 'Produto' },
  { value: 'service', label: 'Serviço' },
  { value: 'policy', label: 'Política' },
  { value: 'faq', label: 'FAQ' },
  { value: 'custom', label: 'Personalizado' },
];

const DEFAULT_FIELDS_BY_TYPE = {
  product: [
    { key: 'price', label: 'Preço', type: 'number' },
    { key: 'checkout_url', label: 'URL de Checkout', type: 'text' },
    { key: 'features', label: 'Características', type: 'text' },
  ],
  service: [
    { key: 'duration', label: 'Duração (min)', type: 'number' },
    { key: 'booking_url', label: 'URL de Agendamento', type: 'text' },
  ],
  policy: [
    { key: 'days', label: 'Dias', type: 'number' },
    { key: 'conditions', label: 'Condições', type: 'text' },
  ],
  faq: [
    { key: 'question', label: 'Pergunta', type: 'text' },
    { key: 'answer', label: 'Resposta', type: 'textarea' },
  ],
  custom: [],
};

// ----------------------------------------------------------------------

export function EntityNewEditForm({ entityId }) {
  const navigate = useNavigate();
  const isEdit = !!entityId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'product',
    description: '',
    data: {},
  });

  const [dataFields, setDataFields] = useState([]);

  // Fetch entity if editing
  useEffect(() => {
    if (isEdit) {
      const fetchEntity = async () => {
        try {
          setLoading(true);
          const response = await axios.get(endpoints.entities.details(entityId));
          const entity = response.data;
          setFormData({
            name: entity.name,
            type: entity.type,
            description: entity.description || '',
            data: entity.data || {},
          });
          // Convert data object to fields array
          const fields = Object.entries(entity.data || {}).map(([key, value]) => ({
            key,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          }));
          setDataFields(fields.length > 0 ? fields : [{ key: '', value: '' }]);
        } catch (error) {
          console.error('Failed to fetch entity:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchEntity();
    } else {
      // Set default fields based on type
      const defaultFields = DEFAULT_FIELDS_BY_TYPE[formData.type] || [];
      setDataFields(
        defaultFields.length > 0
          ? defaultFields.map((f) => ({ key: f.key, value: '' }))
          : [{ key: '', value: '' }]
      );
    }
  }, [isEdit, entityId]);

  const handleTypeChange = (event) => {
    const newType = event.target.value;
    setFormData((prev) => ({ ...prev, type: newType }));

    // Reset fields to defaults for new type (only if creating)
    if (!isEdit) {
      const defaultFields = DEFAULT_FIELDS_BY_TYPE[newType] || [];
      setDataFields(
        defaultFields.length > 0
          ? defaultFields.map((f) => ({ key: f.key, value: '' }))
          : [{ key: '', value: '' }]
      );
    }
  };

  const handleFieldChange = (index, field, value) => {
    setDataFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddField = () => {
    setDataFields((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveField = (index) => {
    setDataFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Convert fields array to data object
    const data = {};
    dataFields.forEach((field) => {
      if (field.key.trim()) {
        // Try to parse as JSON/number, otherwise keep as string
        try {
          const parsed = JSON.parse(field.value);
          data[field.key] = parsed;
        } catch {
          const num = Number(field.value);
          data[field.key] = !isNaN(num) && field.value.trim() !== '' ? num : field.value;
        }
      }
    });

    const payload = {
      name: formData.name,
      type: formData.type,
      description: formData.description || null,
      data,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await axios.patch(endpoints.entities.update(entityId), payload);
      } else {
        await axios.post(endpoints.entities.create, payload);
      }
      navigate(paths.dashboard.entity.root);
    } catch (error) {
      console.error('Failed to save entity:', error);
      alert('Erro ao salvar entidade');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardContent>
        <Typography>Carregando...</Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="md">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 5 }}>
        <Typography variant="h4">{isEdit ? 'Editar Entidade' : 'Nova Entidade'}</Typography>
      </Stack>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Nome"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />

              <TextField
                fullWidth
                select
                label="Tipo"
                value={formData.type}
                onChange={handleTypeChange}
              >
                {ENTITY_TYPES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                multiline
                rows={2}
              />

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Dados
                </Typography>

                <Stack spacing={2}>
                  {dataFields.map((field, index) => (
                    <Stack key={index} direction="row" spacing={2} alignItems="center">
                      <TextField
                        label="Campo"
                        value={field.key}
                        onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                        size="small"
                        sx={{ width: 200 }}
                      />
                      <TextField
                        label="Valor"
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <IconButton
                        onClick={() => handleRemoveField(index)}
                        color="error"
                        disabled={dataFields.length === 1}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>

                <Button
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={handleAddField}
                  sx={{ mt: 2 }}
                >
                  Adicionar Campo
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(paths.dashboard.entity.root)}
          >
            Cancelar
          </Button>
          <Button variant="contained" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </Stack>
      </form>
    </DashboardContent>
  );
}
