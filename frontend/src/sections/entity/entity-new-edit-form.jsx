import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import axios, { endpoints } from 'src/utils/axios';

import entitySchemas from 'src/assets/data/entity-schemas.json';

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
  const getFieldInfo = (fieldKey) => {
    return entitySchemas.fields[fieldKey] || {
      label: fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      type: 'text',
      icon: 'solar:document-text-bold-duotone',
      placeholder: '',
      isCustom: true,
    };
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
  const [expandedSubgroup, setExpandedSubgroup] = useState(null);

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

  const handleGroupClick = (groupId) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
    setExpandedSubgroup(null);
  };

  const handleSubgroupClick = (subgroupId) => {
    setExpandedSubgroup(expandedSubgroup === subgroupId ? null : subgroupId);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
          <Box sx={{ p: 2, pt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {filteredFields.length} resultado(s)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {filteredFields.map((field) => (
                <Chip
                  key={field.key}
                  icon={<Iconify icon={field.icon} />}
                  label={field.label}
                  onClick={() => onSelect(field.key)}
                  disabled={selectedFields.includes(field.key)}
                  variant={selectedFields.includes(field.key) ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Stack>
          </Box>
        ) : (
          <>
            {/* Suggested Fields */}
            {suggestedFields.length > 0 && (
              <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: `${categoryInfo.color}08`,
                  }}
                >
                  <Iconify icon="solar:star-bold-duotone" sx={{ color: categoryInfo.color, mr: 1.5 }} />
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>
                    Sugeridos para {templateInfo?.name || categoryInfo.name}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, pt: 1 }}>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {suggestedFields.map((fieldKey) => {
                      const field = entitySchemas.fields[fieldKey];
                      if (!field) return null;
                      return (
                        <Chip
                          key={fieldKey}
                          icon={<Iconify icon={field.icon} />}
                          label={field.label}
                          onClick={() => onSelect(fieldKey)}
                          disabled={selectedFields.includes(fieldKey)}
                          color="primary"
                          variant={selectedFields.includes(fieldKey) ? 'filled' : 'outlined'}
                          size="small"
                        />
                      );
                    })}
                  </Stack>
                </Box>
              </Box>
            )}

            {/* Field Groups (Folders) */}
            {entitySchemas.fieldGroups.map((group) => (
              <Box key={group.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                {/* Group Header (Folder) */}
                <Box
                  onClick={() => handleGroupClick(group.id)}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Iconify
                    icon={expandedGroup === group.id ? 'solar:folder-open-bold-duotone' : 'solar:folder-bold-duotone'}
                    sx={{ color: 'primary.main', mr: 1.5 }}
                  />
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>
                    {group.name}
                  </Typography>
                  <Chip
                    label={group.subgroups.reduce((acc, sg) => acc + sg.fields.length, 0)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Iconify
                    icon={expandedGroup === group.id ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'}
                    sx={{ color: 'text.secondary' }}
                  />
                </Box>

                {/* Subgroups (Subfolders) */}
                <Collapse in={expandedGroup === group.id}>
                  <Box sx={{ pl: 2 }}>
                    {group.subgroups.map((subgroup) => (
                      <Box key={subgroup.id}>
                        {/* Subgroup Header */}
                        <Box
                          onClick={() => handleSubgroupClick(subgroup.id)}
                          sx={{
                            p: 1.5,
                            pl: 2,
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                            borderLeft: '2px solid',
                            borderColor: expandedSubgroup === subgroup.id ? 'primary.main' : 'transparent',
                          }}
                        >
                          <Iconify
                            icon={expandedSubgroup === subgroup.id ? 'eva:folder-open-outline' : 'eva:folder-outline'}
                            sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }}
                          />
                          <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary' }}>
                            {subgroup.name}
                          </Typography>
                          <Chip label={subgroup.fields.length} size="small" variant="outlined" sx={{ mr: 1 }} />
                          <Iconify
                            icon={expandedSubgroup === subgroup.id ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'}
                            sx={{ color: 'text.disabled', fontSize: 16 }}
                          />
                        </Box>

                        {/* Fields */}
                        <Collapse in={expandedSubgroup === subgroup.id}>
                          <Box sx={{ p: 1.5, pl: 4 }}>
                            <Stack direction="row" flexWrap="wrap" gap={0.75}>
                              {subgroup.fields.map((fieldKey) => {
                                const field = entitySchemas.fields[fieldKey];
                                if (!field) return null;
                                return (
                                  <Chip
                                    key={fieldKey}
                                    icon={<Iconify icon={field.icon} />}
                                    label={field.label}
                                    onClick={() => onSelect(fieldKey)}
                                    disabled={selectedFields.includes(fieldKey)}
                                    variant={selectedFields.includes(fieldKey) ? 'filled' : 'outlined'}
                                    size="small"
                                  />
                                );
                              })}
                            </Stack>
                          </Box>
                        </Collapse>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            ))}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
