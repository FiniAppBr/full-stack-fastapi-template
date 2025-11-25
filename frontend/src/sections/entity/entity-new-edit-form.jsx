import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';

import axios, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard';
import entitySchemas from 'src/assets/data/entity-schemas.json';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function EntityNewEditForm({ entityId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!entityId;

  // Get category and template from URL (for new entities)
  const urlCategory = searchParams.get('category');
  const urlTemplate = searchParams.get('template');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(urlCategory || 'custom');
  const [template, setTemplate] = useState(urlTemplate || null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [capabilities, setCapabilities] = useState([]);

  // Custom field input
  const [customFieldKey, setCustomFieldKey] = useState('');

  // Field picker dialog
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);

  // Get category and template info
  const categoryInfo = useMemo(
    () => entitySchemas.categories.find((c) => c.id === category) || entitySchemas.categories[7],
    [category]
  );

  const templateInfo = useMemo(() => {
    if (!template || !categoryInfo) return null;
    return categoryInfo.templates.find((t) => t.id === template);
  }, [template, categoryInfo]);

  // Initialize fields based on template
  useEffect(() => {
    if (!isEdit && templateInfo?.suggestedFields) {
      setSelectedFields(templateInfo.suggestedFields);
      const initialValues = {};
      templateInfo.suggestedFields.forEach((fieldKey) => {
        initialValues[fieldKey] = '';
      });
      setFieldValues(initialValues);
    }
  }, [isEdit, templateInfo]);

  // Fetch entity if editing
  useEffect(() => {
    if (isEdit) {
      const fetchEntity = async () => {
        try {
          setLoading(true);
          const response = await axios.get(endpoints.entities.details(entityId));
          const entity = response.data;

          setName(entity.name);
          setDescription(entity.description || '');
          setCategory(entity.category);
          setTemplate(entity.template);
          setCapabilities(entity.capabilities || []);

          const dataKeys = Object.keys(entity.data || {});
          setSelectedFields(dataKeys);

          const values = {};
          dataKeys.forEach((key) => {
            const val = entity.data[key];
            if (Array.isArray(val)) {
              values[key] = val.join(', ');
            } else if (typeof val === 'object') {
              values[key] = JSON.stringify(val);
            } else {
              values[key] = String(val);
            }
          });
          setFieldValues(values);
        } catch (error) {
          console.error('Failed to fetch entity:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchEntity();
    }
  }, [isEdit, entityId]);

  // Field management
  const handleAddField = (fieldKey) => {
    if (!selectedFields.includes(fieldKey)) {
      setSelectedFields([...selectedFields, fieldKey]);
      setFieldValues({ ...fieldValues, [fieldKey]: '' });
    }
    setFieldPickerOpen(false);
  };

  const handleAddCustomField = () => {
    const key = customFieldKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (key && !selectedFields.includes(key)) {
      setSelectedFields([...selectedFields, key]);
      setFieldValues({ ...fieldValues, [key]: '' });
      setCustomFieldKey('');
    }
  };

  const handleRemoveField = (fieldKey) => {
    setSelectedFields(selectedFields.filter((f) => f !== fieldKey));
    const newValues = { ...fieldValues };
    delete newValues[fieldKey];
    setFieldValues(newValues);
  };

  const handleFieldValueChange = (fieldKey, value) => {
    setFieldValues({ ...fieldValues, [fieldKey]: value });
  };

  // Get field info from schema (or create default for custom fields)
  const getFieldInfo = (fieldKey) => entitySchemas.fields[fieldKey] || {
      label: fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      type: 'text',
      icon: 'solar:document-text-bold-duotone',
      placeholder: '',
      isCustom: true,
    };

  // Submit handler
  const handleSubmit = async (event) => {
    event.preventDefault();

    const data = {};
    selectedFields.forEach((fieldKey) => {
      const fieldInfo = getFieldInfo(fieldKey);
      const value = fieldValues[fieldKey];

      if (!value || value.trim() === '') return;

      switch (fieldInfo.type) {
        case 'number':
        case 'currency':
          data[fieldKey] = parseFloat(value) || 0;
          break;
        case 'list':
          data[fieldKey] = value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          break;
        default:
          data[fieldKey] = value;
      }
    });

    const payload = {
      name,
      category,
      template,
      description: description || null,
      data,
      capabilities,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await axios.patch(endpoints.entities.update(entityId), payload);
      } else {
        await axios.post(endpoints.entities.create, payload);
      }
      navigate(paths.dashboard.knowledge.root);
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
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <IconButton onClick={() => navigate(paths.dashboard.entity.root)}>
          <Iconify icon="eva:arrow-back-fill" />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">{isEdit ? 'Editar Entidade' : 'Nova Entidade'}</Typography>
          {categoryInfo && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip
                size="small"
                icon={<Iconify icon={categoryInfo.icon} />}
                label={categoryInfo.name}
                sx={{
                  bgcolor: `${categoryInfo.color}15`,
                  color: categoryInfo.color,
                  fontWeight: 600,
                }}
              />
              {templateInfo && (
                <Chip size="small" label={templateInfo.name} variant="outlined" />
              )}
            </Stack>
          )}
        </Box>
      </Stack>

      <form onSubmit={handleSubmit}>
        {/* Basic Info Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Informações Básicas
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={templateInfo?.name ? `Ex: Meu ${templateInfo.name}` : 'Nome da entidade'}
              />

              <TextField
                fullWidth
                label="Descrição"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                placeholder="Descrição breve (opcional)"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Capabilities Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Capacidades Operacionais
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Habilite capacidades para que agentes possam realizar ações com esta entidade
            </Typography>

            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={capabilities.includes('bookable')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCapabilities([...capabilities, 'bookable']);
                      } else {
                        setCapabilities(capabilities.filter((c) => c !== 'bookable'));
                      }
                    }}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon="solar:calendar-bold-duotone" sx={{ color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Agendável</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pode ser agendado (serviços, consultas)
                      </Typography>
                    </Box>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={capabilities.includes('schedulable')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCapabilities([...capabilities, 'schedulable']);
                      } else {
                        setCapabilities(capabilities.filter((c) => c !== 'schedulable'));
                      }
                    }}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon="solar:clock-circle-bold-duotone" sx={{ color: 'info.main' }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Tem Horários</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Possui agenda de disponibilidade (profissionais, salas)
                      </Typography>
                    </Box>
                  </Stack>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={capabilities.includes('stockable')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCapabilities([...capabilities, 'stockable']);
                      } else {
                        setCapabilities(capabilities.filter((c) => c !== 'stockable'));
                      }
                    }}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon="solar:box-bold-duotone" sx={{ color: 'warning.main' }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Tem Estoque</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Possui controle de quantidade (produtos físicos)
                      </Typography>
                    </Box>
                  </Stack>
                }
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Data Fields Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Campos de Dados</Typography>
              <Button
                size="small"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={() => setFieldPickerOpen(true)}
              >
                Biblioteca de Campos
              </Button>
            </Stack>

            {selectedFields.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Nenhum campo adicionado ainda. Use a biblioteca ou adicione um campo personalizado abaixo.
              </Alert>
            ) : (
              <Stack spacing={2} sx={{ mb: 3 }}>
                {selectedFields.map((fieldKey) => {
                  const fieldInfo = getFieldInfo(fieldKey);
                  return (
                    <Box key={fieldKey}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: fieldInfo.isCustom ? '#75757515' : `${categoryInfo.color}10`,
                            flexShrink: 0,
                            mt: 0.5,
                          }}
                        >
                          <Iconify
                            icon={fieldInfo.icon}
                            sx={{ color: fieldInfo.isCustom ? '#757575' : categoryInfo.color }}
                          />
                        </Box>

                        <Box sx={{ flex: 1 }}>
                          <TextField
                            fullWidth
                            label={
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <span>{fieldInfo.label}</span>
                                {fieldInfo.isCustom && (
                                  <Chip label="personalizado" size="small" sx={{ height: 16, fontSize: '0.65rem' }} />
                                )}
                              </Stack>
                            }
                            value={fieldValues[fieldKey] || ''}
                            onChange={(e) => handleFieldValueChange(fieldKey, e.target.value)}
                            placeholder={fieldInfo.placeholder}
                            multiline={fieldInfo.type === 'textarea'}
                            rows={fieldInfo.type === 'textarea' ? 3 : 1}
                            size="small"
                            InputProps={{
                              startAdornment:
                                fieldInfo.type === 'currency' ? (
                                  <InputAdornment position="start">R$</InputAdornment>
                                ) : null,
                            }}
                            helperText={
                              fieldInfo.type === 'list'
                                ? 'Separe itens por vírgula'
                                : fieldInfo.type === 'url'
                                  ? 'URL completa com https://'
                                  : null
                            }
                          />
                        </Box>

                        <IconButton
                          size="small"
                          onClick={() => handleRemoveField(fieldKey)}
                          sx={{ mt: 0.5 }}
                        >
                          <Iconify icon="eva:close-fill" />
                        </IconButton>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}

            {/* Custom Field Input */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Adicionar campo personalizado
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Nome do campo (ex: cor_preferida)"
                value={customFieldKey}
                onChange={(e) => setCustomFieldKey(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomField();
                  }
                }}
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="solar:widget-add-bold-duotone" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                onClick={handleAddCustomField}
                disabled={!customFieldKey.trim()}
              >
                Adicionar
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => navigate(paths.dashboard.entity.root)}>
            Cancelar
          </Button>
          <Button variant="contained" type="submit" disabled={saving || !name}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Entidade'}
          </Button>
        </Stack>
      </form>

      {/* Field Picker Dialog */}
      <FieldPickerDialog
        open={fieldPickerOpen}
        onClose={() => setFieldPickerOpen(false)}
        onSelect={handleAddField}
        selectedFields={selectedFields}
        categoryInfo={categoryInfo}
        templateInfo={templateInfo}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function FieldPickerDialog({ open, onClose, onSelect, selectedFields, categoryInfo, templateInfo }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState(null);

  const suggestedFields = templateInfo?.suggestedFields || [];

  // Filter fields based on search
  const filteredFields = useMemo(() => {
    if (!searchQuery) return null;

    const query = searchQuery.toLowerCase();
    return Object.entries(entitySchemas.fields)
      .filter(
        ([key, field]) =>
          key.toLowerCase().includes(query) || field.label.toLowerCase().includes(query)
      )
      .map(([key, field]) => ({ key, ...field }));
  }, [searchQuery]);

  // Handle group click - auto expand all subgroups
  const handleGroupClick = (groupId) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Biblioteca de Campos</Typography>
          <IconButton onClick={onClose} size="small">
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Search */}
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth
            placeholder="Buscar campo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Search Results */}
        {filteredFields ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              {filteredFields.length} resultado(s)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {filteredFields.map((field) => (
                <Chip
                  key={field.key}
                  label={field.label}
                  icon={<Iconify icon={field.icon} width={16} />}
                  onClick={() => !selectedFields.includes(field.key) && onSelect(field.key)}
                  disabled={selectedFields.includes(field.key)}
                  sx={{
                    opacity: selectedFields.includes(field.key) ? 0.5 : 1,
                    '& .MuiChip-icon': { color: 'inherit' },
                  }}
                />
              ))}
            </Stack>
          </Box>
        ) : (
          <Box>
            {/* Suggested Fields */}
            {suggestedFields.length > 0 && (
              <Box sx={{ p: 2, bgcolor: `${categoryInfo.color}08`, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Iconify icon="solar:star-bold-duotone" sx={{ color: categoryInfo.color }} />
                  <Typography variant="subtitle2">
                    Sugeridos para {templateInfo?.name || categoryInfo.name}
                  </Typography>
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {suggestedFields.map((fieldKey) => {
                    const field = entitySchemas.fields[fieldKey];
                    if (!field) return null;
                    const isSelected = selectedFields.includes(fieldKey);
                    return (
                      <Chip
                        key={fieldKey}
                        label={field.label}
                        icon={<Iconify icon={field.icon} width={16} />}
                        onClick={() => !isSelected && onSelect(fieldKey)}
                        disabled={isSelected}
                        sx={{
                          bgcolor: isSelected ? 'action.disabledBackground' : categoryInfo.color,
                          color: isSelected ? 'text.disabled' : 'white',
                          opacity: isSelected ? 0.5 : 1,
                          '& .MuiChip-icon': { color: 'inherit' },
                          '&:hover': !isSelected ? { bgcolor: categoryInfo.color, filter: 'brightness(1.1)' } : {},
                        }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Category List (like template dialog) */}
            {entitySchemas.fieldGroups.map((group) => (
              <Box key={group.id}>
                {/* Group Header */}
                <Box
                  onClick={() => handleGroupClick(group.id)}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    bgcolor: expandedGroup === group.id ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'primary.lighter',
                      mr: 2,
                    }}
                  >
                    <Iconify icon={group.icon} sx={{ color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">{group.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {group.description}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${group.subgroups.reduce((acc, sg) => acc + sg.fields.length, 0)} campos`}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  <Iconify
                    icon={expandedGroup === group.id ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'}
                    sx={{ color: 'text.secondary' }}
                  />
                </Box>

                {/* Expanded Subgroups with Pills */}
                <Collapse in={expandedGroup === group.id}>
                  <Box sx={{ px: 2, pb: 2, pt: 0 }}>
                    {group.subgroups.map((subgroup) => (
                      <Box key={subgroup.id} sx={{ mb: 2 }}>
                        {/* Subgroup Divider */}
                        <Divider sx={{ my: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {subgroup.name}
                          </Typography>
                        </Divider>
                        {/* Field Pills */}
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          {subgroup.fields.map((fieldKey) => {
                            const field = entitySchemas.fields[fieldKey];
                            if (!field) return null;
                            const isSelected = selectedFields.includes(fieldKey);
                            return (
                              <Chip
                                key={fieldKey}
                                label={field.label}
                                icon={<Iconify icon={field.icon} width={16} />}
                                onClick={() => !isSelected && onSelect(fieldKey)}
                                disabled={isSelected}
                                variant={isSelected ? 'filled' : 'outlined'}
                                sx={{
                                  opacity: isSelected ? 0.5 : 1,
                                  '& .MuiChip-icon': { color: 'inherit' },
                                }}
                              />
                            );
                          })}
                        </Stack>
                      </Box>
                    ))}
                  </Box>
                </Collapse>

                <Divider />
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

