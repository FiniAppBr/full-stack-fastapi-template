import { useState, useEffect, useCallback, useMemo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';
import { LinkButton } from 'src/components/link-button';

import { colorWithOpacity } from '../constants';
import { fields as fieldDefinitions, fieldGroups, getField } from '../data/card-definitions';

/**
 * Modal for creating/editing entities.
 */
export function EntityFormModal({
  open,
  onClose,
  onSave,
  entity = null,
  card,
  templates = [],
  initialTemplate = null,
  loading = false,
}) {
  const isEditing = Boolean(entity);
  const color = card?.color || '#5C6BC0';

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState(initialTemplate);
  const [selectedFields, setSelectedFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [capabilities, setCapabilities] = useState([]);
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);

  // Get template info
  const templateInfo = useMemo(() => {
    if (!templateId) return null;
    return templates.find((t) => t.id === templateId);
  }, [templateId, templates]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (isEditing && entity) {
        setName(entity.name || '');
        setDescription(entity.description || '');
        setTemplateId(entity.template || null);
        setCapabilities(entity.capabilities || []);
        const dataKeys = Object.keys(entity.data || {});
        setSelectedFields(dataKeys);
        const values = {};
        dataKeys.forEach((key) => {
          const val = entity.data[key];
          values[key] = Array.isArray(val) ? val.join(', ') : String(val || '');
        });
        setFieldValues(values);
      } else {
        setName('');
        setDescription('');
        setTemplateId(initialTemplate);
        setCapabilities([]);
        setSelectedFields([]);
        setFieldValues({});
        // Auto-add suggested fields
        if (initialTemplate) {
          const tpl = templates.find((t) => t.id === initialTemplate);
          if (tpl?.suggestedFields) {
            setSelectedFields(tpl.suggestedFields);
            const values = {};
            tpl.suggestedFields.forEach((key) => { values[key] = ''; });
            setFieldValues(values);
          }
        }
      }
    }
  }, [open, isEditing, entity, initialTemplate, templates]);

  // When template changes, add suggested fields
  useEffect(() => {
    if (!isEditing && templateInfo?.suggestedFields) {
      const newFields = templateInfo.suggestedFields.filter((f) => !selectedFields.includes(f));
      if (newFields.length > 0) {
        setSelectedFields((prev) => [...prev, ...newFields]);
        setFieldValues((prev) => {
          const values = { ...prev };
          newFields.forEach((key) => { values[key] = ''; });
          return values;
        });
      }
    }
  }, [templateInfo, isEditing, selectedFields]);

  // Field management
  const handleAddField = useCallback((fieldKey) => {
    if (!selectedFields.includes(fieldKey)) {
      setSelectedFields((prev) => [...prev, fieldKey]);
      setFieldValues((prev) => ({ ...prev, [fieldKey]: '' }));
    }
    setFieldPickerOpen(false);
  }, [selectedFields]);

  const handleAddCustomField = useCallback(() => {
    const key = customFieldKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (key && !selectedFields.includes(key)) {
      setSelectedFields((prev) => [...prev, key]);
      setFieldValues((prev) => ({ ...prev, [key]: '' }));
      setCustomFieldKey('');
    }
  }, [customFieldKey, selectedFields]);

  const handleRemoveField = useCallback((fieldKey) => {
    setSelectedFields((prev) => prev.filter((f) => f !== fieldKey));
    setFieldValues((prev) => {
      const newValues = { ...prev };
      delete newValues[fieldKey];
      return newValues;
    });
  }, []);

  const handleFieldValueChange = useCallback((fieldKey, value) => {
    setFieldValues((prev) => ({ ...prev, [fieldKey]: value }));
  }, []);

  const toggleCapability = useCallback((cap) => {
    setCapabilities((prev) => prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]);
  }, []);

  // Submit
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const data = {};
    selectedFields.forEach((fieldKey) => {
      const fieldInfo = getField(fieldKey);
      const value = fieldValues[fieldKey];
      if (!value || value.trim() === '') return;
      switch (fieldInfo.type) {
        case 'number':
        case 'currency':
          data[fieldKey] = parseFloat(value) || 0;
          break;
        case 'list':
          data[fieldKey] = value.split(',').map((s) => s.trim()).filter(Boolean);
          break;
        default:
          data[fieldKey] = value;
      }
    });

    onSave({
      id: entity?.id,
      name,
      description: description || null,
      category: templateInfo?.category || card?.categories?.[0],
      template: templateId,
      data,
      capabilities,
    });
  }, [name, description, card, templateInfo, templateId, selectedFields, fieldValues, capabilities, entity, onSave]);

  // Template picker (when no template selected)
  if (!templateId && !isEditing && templates.length > 0) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colorWithOpacity(color, 0.1) }}>
              <Iconify icon={card?.icon} width={24} sx={{ color }} />
            </Box>
            <Box>
              <Typography variant="h6">{card?.title}</Typography>
              <Typography variant="caption" color="text.secondary">Escolha um tipo</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {templates.map((tpl) => (
              <Box
                key={tpl.id}
                onClick={() => setTemplateId(tpl.id)}
                sx={{
                  p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 2, transition: 'all 0.2s',
                  '&:hover': { borderColor: color, bgcolor: colorWithOpacity(color, 0.04) },
                }}
              >
                <Box sx={{ width: 44, height: 44, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colorWithOpacity(color, 0.1) }}>
                  <Iconify icon={tpl.icon} width={24} sx={{ color }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">{tpl.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{tpl.description}</Typography>
                </Box>
                <Iconify icon="eva:chevron-right-fill" sx={{ color: 'text.disabled' }} />
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Main form
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={2}>
              {!isEditing && templateId && templates.length > 1 && (
                <IconButton onClick={() => setTemplateId(null)} size="small" sx={{ mr: -1 }}>
                  <Iconify icon="eva:arrow-back-fill" />
                </IconButton>
              )}
              <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colorWithOpacity(color, 0.1) }}>
                <Iconify icon={templateInfo?.icon || card?.icon} width={24} sx={{ color }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">{isEditing ? 'Editar' : 'Novo'} {templateInfo?.name || 'Item'}</Typography>
                <Typography variant="caption" color="text.secondary">{card?.title}</Typography>
              </Box>
              {/* Link Button for existing entities */}
              {isEditing && entity?.id && (
                <LinkButton entityId={entity.id} />
              )}
            </Stack>
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={3}>
              {/* Basic Info */}
              <Stack spacing={2}>
                <TextField fullWidth label="Nome" value={name} onChange={(e) => setName(e.target.value)} required placeholder={templateInfo?.name ? `Ex: Meu ${templateInfo.name}` : 'Nome do item'} />
                <TextField fullWidth label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={2} placeholder="Descrição breve (opcional)" />
              </Stack>

              {/* Capabilities */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Capacidades</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <FormControlLabel control={<Checkbox checked={capabilities.includes('bookable')} onChange={() => toggleCapability('bookable')} size="small" />} label={<Typography variant="body2">Agendável</Typography>} />
                  <FormControlLabel control={<Checkbox checked={capabilities.includes('schedulable')} onChange={() => toggleCapability('schedulable')} size="small" />} label={<Typography variant="body2">Tem Horários</Typography>} />
                  <FormControlLabel control={<Checkbox checked={capabilities.includes('stockable')} onChange={() => toggleCapability('stockable')} size="small" />} label={<Typography variant="body2">Tem Estoque</Typography>} />
                </Stack>
              </Box>

              {/* Data Fields */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2">Campos de Dados</Typography>
                  <Button size="small" startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => setFieldPickerOpen(true)}>Biblioteca</Button>
                </Stack>

                {selectedFields.length === 0 ? (
                  <Alert severity="info" sx={{ fontSize: '0.8rem' }}>Nenhum campo adicionado.</Alert>
                ) : (
                  <Stack spacing={2}>
                    {selectedFields.map((fieldKey) => {
                      const fieldInfo = getField(fieldKey);
                      return (
                        <Stack key={fieldKey} direction="row" spacing={1} alignItems="flex-start">
                          <Box sx={{ width: 36, height: 36, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colorWithOpacity(color, 0.1), flexShrink: 0, mt: 0.5 }}>
                            <Iconify icon={fieldInfo.icon || 'solar:document-text-bold-duotone'} width={18} sx={{ color }} />
                          </Box>
                          <TextField
                            fullWidth size="small" label={fieldInfo.label} value={fieldValues[fieldKey] || ''} onChange={(e) => handleFieldValueChange(fieldKey, e.target.value)}
                            placeholder={fieldInfo.placeholder} multiline={fieldInfo.type === 'textarea'} rows={fieldInfo.type === 'textarea' ? 3 : 1}
                            InputProps={{ startAdornment: fieldInfo.type === 'currency' ? <InputAdornment position="start">R$</InputAdornment> : null }}
                            helperText={fieldInfo.type === 'list' ? 'Separe itens por vírgula' : null}
                          />
                          <IconButton size="small" onClick={() => handleRemoveField(fieldKey)} sx={{ mt: 0.5 }}><Iconify icon="eva:close-fill" width={18} /></IconButton>
                        </Stack>
                      );
                    })}
                  </Stack>
                )}

                {/* Custom field input */}
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={1}>
                  <TextField size="small" placeholder="Campo personalizado" value={customFieldKey} onChange={(e) => setCustomFieldKey(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomField())} sx={{ flex: 1 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Iconify icon="solar:widget-add-bold-duotone" width={18} sx={{ color: 'text.disabled' }} /></InputAdornment> }}
                  />
                  <Button variant="outlined" onClick={handleAddCustomField} disabled={!customFieldKey.trim()}>Adicionar</Button>
                </Stack>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={onClose} color="inherit" disabled={loading}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={loading || !name} startIcon={loading ? <CircularProgress size={16} /> : null}>
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Field Picker Dialog */}
      <FieldPickerDialog
        open={fieldPickerOpen}
        onClose={() => setFieldPickerOpen(false)}
        onSelect={handleAddField}
        selectedFields={selectedFields}
        color={color}
        suggestedFields={templateInfo?.suggestedFields || []}
        templateName={templateInfo?.name}
      />
    </>
  );
}

/**
 * Field picker dialog
 */
function FieldPickerDialog({ open, onClose, onSelect, selectedFields, color, suggestedFields, templateName }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState(null);

  const filteredFields = useMemo(() => {
    if (!searchQuery) return null;
    const query = searchQuery.toLowerCase();
    return Object.entries(fieldDefinitions)
      .filter(([key, field]) => key.toLowerCase().includes(query) || field.label.toLowerCase().includes(query))
      .map(([key, field]) => ({ key, ...field }));
  }, [searchQuery]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Biblioteca de Campos</Typography>
          <IconButton onClick={onClose} size="small"><Iconify icon="eva:close-fill" /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField fullWidth placeholder="Buscar campo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} size="small"
            InputProps={{ startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
          />
        </Box>

        {filteredFields ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>{filteredFields.length} resultado(s)</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {filteredFields.map((field) => (
                <Chip key={field.key} label={field.label} icon={<Iconify icon={field.icon} width={16} />}
                  onClick={() => !selectedFields.includes(field.key) && onSelect(field.key)}
                  disabled={selectedFields.includes(field.key)} sx={{ opacity: selectedFields.includes(field.key) ? 0.5 : 1 }}
                />
              ))}
            </Stack>
          </Box>
        ) : (
          <Box>
            {suggestedFields.length > 0 && (
              <Box sx={{ p: 2, bgcolor: colorWithOpacity(color, 0.04), borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Iconify icon="solar:star-bold-duotone" sx={{ color }} />
                  <Typography variant="subtitle2">Sugeridos para {templateName}</Typography>
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {suggestedFields.map((fieldKey) => {
                    const field = fieldDefinitions[fieldKey];
                    if (!field) return null;
                    const isSelected = selectedFields.includes(fieldKey);
                    return (
                      <Chip key={fieldKey} label={field.label} icon={<Iconify icon={field.icon} width={16} />}
                        onClick={() => !isSelected && onSelect(fieldKey)} disabled={isSelected}
                        sx={{ bgcolor: isSelected ? 'action.disabledBackground' : color, color: isSelected ? 'text.disabled' : 'white', opacity: isSelected ? 0.5 : 1, '& .MuiChip-icon': { color: 'inherit' } }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}

            {fieldGroups.map((group) => (
              <Box key={group.id}>
                <Box onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                  sx={{ p: 2, display: 'flex', alignItems: 'center', cursor: 'pointer', bgcolor: expandedGroup === group.id ? 'action.hover' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.lighter', mr: 2 }}>
                    <Iconify icon={group.icon} sx={{ color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">{group.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{group.description}</Typography>
                  </Box>
                  <Chip label={`${group.subgroups.reduce((acc, sg) => acc + sg.fields.length, 0)} campos`} size="small" variant="outlined" sx={{ mr: 1 }} />
                  <Iconify icon={expandedGroup === group.id ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'} sx={{ color: 'text.secondary' }} />
                </Box>

                <Collapse in={expandedGroup === group.id}>
                  <Box sx={{ px: 2, pb: 2 }}>
                    {group.subgroups.map((subgroup) => (
                      <Box key={subgroup.id} sx={{ mb: 2 }}>
                        <Divider sx={{ my: 1.5 }}><Typography variant="caption" color="text.secondary">{subgroup.name}</Typography></Divider>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          {subgroup.fields.map((fieldKey) => {
                            const field = fieldDefinitions[fieldKey];
                            if (!field) return null;
                            const isSelected = selectedFields.includes(fieldKey);
                            return (
                              <Chip key={fieldKey} label={field.label} icon={<Iconify icon={field.icon} width={16} />}
                                onClick={() => !isSelected && onSelect(fieldKey)} disabled={isSelected}
                                variant={isSelected ? 'filled' : 'outlined'} sx={{ opacity: isSelected ? 0.5 : 1 }}
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
