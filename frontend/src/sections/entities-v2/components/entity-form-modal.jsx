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

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';
import { LinkButton } from 'src/components/link-button';

import { colorWithOpacity } from '../constants';
import { fields as fieldDefinitions, getField } from '../data/card-definitions';

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

  // Custom field types (for fields created via primitives)
  const [customFieldTypes, setCustomFieldTypes] = useState({});

  // Field management
  const handleAddField = useCallback((fieldKey, fieldType = null) => {
    if (!selectedFields.includes(fieldKey)) {
      setSelectedFields((prev) => [...prev, fieldKey]);
      setFieldValues((prev) => ({ ...prev, [fieldKey]: '' }));
      if (fieldType) {
        setCustomFieldTypes((prev) => ({ ...prev, [fieldKey]: fieldType }));
      }
    }
    setFieldPickerOpen(false);
  }, [selectedFields]);

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
                      const fieldType = customFieldTypes[fieldKey] || fieldInfo.type;
                      const fieldLabel = fieldInfo.label !== fieldKey ? fieldInfo.label : fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                      const isTextarea = fieldType === 'textarea';
                      const isCurrency = fieldType === 'currency';
                      const isList = fieldType === 'list';
                      return (
                        <Stack key={fieldKey} direction="row" spacing={1} alignItems="flex-start">
                          <Box sx={{ width: 36, height: 36, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colorWithOpacity(color, 0.1), flexShrink: 0, mt: 0.5 }}>
                            <Iconify icon={fieldInfo.icon || 'solar:document-text-bold-duotone'} width={18} sx={{ color }} />
                          </Box>
                          <TextField
                            fullWidth size="small" label={fieldLabel} value={fieldValues[fieldKey] || ''} onChange={(e) => handleFieldValueChange(fieldKey, e.target.value)}
                            placeholder={fieldInfo.placeholder} multiline={isTextarea} rows={isTextarea ? 3 : 1}
                            InputProps={{ startAdornment: isCurrency ? <InputAdornment position="start">R$</InputAdornment> : null }}
                            helperText={isList ? 'Separe itens por vírgula' : null}
                          />
                          <IconButton size="small" onClick={() => handleRemoveField(fieldKey)} sx={{ mt: 0.5 }}><Iconify icon="eva:close-fill" width={18} /></IconButton>
                        </Stack>
                      );
                    })}
                  </Stack>
                )}

              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button onClick={onClose} color="inherit" disabled={loading}>
              Cancelar
            </Button>

            <Box sx={{ flex: 1 }} />

            {/* Link & Process buttons (only when editing) */}
            {isEditing && entity?.id && (
              <>
                <LinkButton entityId={entity.id} />
                <ProcessButton entityId={entity.id} isProcessed={entity.is_processed} />
              </>
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={loading || !name}
              startIcon={loading ? <CircularProgress size={16} /> : null}
              sx={{ bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' } }}
            >
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
 * Primitive field types with examples
 */
const FIELD_PRIMITIVES = [
  {
    id: 'text',
    type: 'text',
    label: 'Texto',
    icon: 'solar:text-bold-duotone',
    examples: 'Nome, cargo, motivo, condição...',
  },
  {
    id: 'textarea',
    type: 'textarea',
    label: 'Texto Longo',
    icon: 'solar:document-text-bold-duotone',
    examples: 'Descrição, resposta, bio, explicação...',
  },
  {
    id: 'number',
    type: 'number',
    label: 'Número',
    icon: 'solar:hashtag-bold-duotone',
    examples: 'Quantidade, dias, horas, idade...',
  },
  {
    id: 'currency',
    type: 'currency',
    label: 'Valor (R$)',
    icon: 'solar:tag-price-bold-duotone',
    examples: 'Preço, desconto, taxa, orçamento...',
  },
  {
    id: 'list',
    type: 'list',
    label: 'Lista',
    icon: 'solar:list-bold-duotone',
    examples: 'Itens, passos, opções, features...',
  },
  {
    id: 'url',
    type: 'url',
    label: 'URL',
    icon: 'solar:link-bold-duotone',
    examples: 'Checkout, agendamento, site, mapa...',
  },
  {
    id: 'email',
    type: 'email',
    label: 'Email',
    icon: 'solar:letter-bold-duotone',
    examples: 'Contato, suporte, comercial...',
  },
  {
    id: 'phone',
    type: 'phone',
    label: 'Telefone',
    icon: 'solar:phone-bold-duotone',
    examples: 'WhatsApp, suporte, comercial...',
  },
];

/**
 * Field picker dialog - simplified with primitives
 */
function FieldPickerDialog({ open, onClose, onSelect, selectedFields, color, suggestedFields, templateName }) {
  const [customFieldName, setCustomFieldName] = useState('');
  const [selectedPrimitive, setSelectedPrimitive] = useState(null);

  const handleSelectPrimitive = (primitive) => {
    setSelectedPrimitive(primitive);
    setCustomFieldName('');
  };

  const handleAddCustomField = () => {
    if (customFieldName.trim() && selectedPrimitive) {
      const fieldKey = customFieldName.trim().toLowerCase().replace(/\s+/g, '_');
      onSelect(fieldKey, selectedPrimitive.type);
      setCustomFieldName('');
      setSelectedPrimitive(null);
    }
  };

  const handleClose = () => {
    setSelectedPrimitive(null);
    setCustomFieldName('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Adicionar Campo</Typography>
          <IconButton onClick={handleClose} size="small"><Iconify icon="eva:close-fill" /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* Suggested fields */}
        {suggestedFields.length > 0 && (
          <Box sx={{ mb: 3 }}>
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
                  <Chip
                    key={fieldKey}
                    label={field.label}
                    icon={<Iconify icon={field.icon} width={16} />}
                    onClick={() => !isSelected && onSelect(fieldKey)}
                    disabled={isSelected}
                    sx={{
                      bgcolor: isSelected ? 'action.disabledBackground' : color,
                      color: isSelected ? 'text.disabled' : 'white',
                      opacity: isSelected ? 0.5 : 1,
                      '& .MuiChip-icon': { color: 'inherit' },
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Primitive types */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Campo personalizado</Typography>

          {selectedPrimitive ? (
            <Box>
              <Button
                startIcon={<Iconify icon="eva:arrow-back-fill" />}
                onClick={() => setSelectedPrimitive(null)}
                size="small"
                sx={{ mb: 2 }}
              >
                Voltar
              </Button>

              <Box sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: color, bgcolor: colorWithOpacity(color, 0.04), mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                  <Iconify icon={selectedPrimitive.icon} width={24} sx={{ color }} />
                  <Typography variant="subtitle1">{selectedPrimitive.label}</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">{selectedPrimitive.examples}</Typography>
              </Box>

              <TextField
                fullWidth
                label="Nome do campo"
                placeholder="Ex: Prazo de entrega"
                value={customFieldName}
                onChange={(e) => setCustomFieldName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomField()}
                autoFocus
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleAddCustomField}
                disabled={!customFieldName.trim()}
                sx={{ mt: 2, bgcolor: color, '&:hover': { bgcolor: color } }}
              >
                Adicionar Campo
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {FIELD_PRIMITIVES.map((primitive) => (
                <Box
                  key={primitive.id}
                  onClick={() => handleSelectPrimitive(primitive)}
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: color,
                      bgcolor: colorWithOpacity(color, 0.04),
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                    <Iconify icon={primitive.icon} width={20} sx={{ color }} />
                    <Typography variant="subtitle2">{primitive.label}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                    {primitive.examples}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Process button - triggers entity processing
 */
function ProcessButton({ entityId, isProcessed }) {
  const [processing, setProcessing] = useState(false);

  const handleProcess = async (e) => {
    e.stopPropagation();
    setProcessing(true);
    try {
      await axios.post(endpoints.entities.process(entityId));
    } catch (error) {
      console.error('Failed to process:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Chip
      label={processing ? 'Processando...' : isProcessed ? 'Reprocessar' : 'Processar'}
      size="small"
      icon={processing ? <CircularProgress size={14} /> : <Iconify icon="solar:cpu-bolt-bold" width={14} />}
      onClick={handleProcess}
      disabled={processing}
      sx={{
        height: 28,
        cursor: 'pointer',
        fontWeight: 500,
        fontSize: '0.75rem',
        ...(isProcessed
          ? {
              bgcolor: 'success.lighter',
              color: 'success.dark',
              '& .MuiChip-icon': { color: 'success.main' },
            }
          : {
              bgcolor: 'warning.lighter',
              color: 'warning.dark',
              '& .MuiChip-icon': { color: 'warning.main' },
            }),
        '&:hover': { filter: 'brightness(0.95)' },
      }}
    />
  );
}
