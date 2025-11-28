import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const PRODUCT_COLOR = '#2065D1';

// All product/service types - single level
const PRODUCT_TYPES = [
  {
    id: 'physical',
    category: 'products',
    template: 'physical_product',
    label: 'Produto físico',
    icon: 'solar:bag-4-bold',
    description: 'Com estoque e envio',
    capabilities: ['stockable'],
    showCapabilities: false,
    fields: [
      { key: 'name', label: 'Nome do produto', placeholder: 'Ex: Camiseta Premium', required: true },
      { key: 'description', label: 'Descrição', placeholder: 'Ex: Camiseta 100% algodão...', multiline: true },
      { key: 'price', label: 'Preço', placeholder: 'Ex: R$ 89,90 ou A partir de R$ 50' },
      { key: 'stock_quantity', label: 'Quantidade em estoque', placeholder: 'Ex: 50' },
      { key: 'shipping_time', label: 'Prazo de envio', placeholder: 'Ex: 3-5 dias úteis' },
    ],
  },
  {
    id: 'digital',
    category: 'products',
    template: 'digital_product',
    label: 'Produto digital',
    icon: 'solar:cloud-download-bold',
    description: 'E-book, curso, software',
    capabilities: [],
    showCapabilities: false,
    fields: [
      { key: 'name', label: 'Nome do produto', placeholder: 'Ex: E-book Marketing Digital', required: true },
      { key: 'description', label: 'Descrição', placeholder: 'Ex: Guia completo com 50 páginas...', multiline: true },
      { key: 'price', label: 'Preço', placeholder: 'Ex: R$ 47,00' },
      { key: 'checkout_url', label: 'Link de compra', placeholder: 'Ex: https://pay.hotmart.com/...' },
      { key: 'access_info', label: 'Como acessar', placeholder: 'Ex: Acesso imediato por e-mail' },
    ],
  },
  {
    id: 'schedulable',
    category: 'products',
    template: 'schedulable_service',
    label: 'Serviço agendável',
    icon: 'solar:calendar-bold',
    description: 'Consulta, sessão, atendimento',
    capabilities: ['schedulable'],
    showCapabilities: false,
    fields: [
      { key: 'name', label: 'Nome do serviço', placeholder: 'Ex: Consulta Nutricional', required: true },
      { key: 'description', label: 'Descrição', placeholder: 'Ex: Avaliação completa + plano alimentar...', multiline: true },
      { key: 'price', label: 'Preço', placeholder: 'Ex: R$ 200 a sessão' },
      { key: 'duration', label: 'Duração', placeholder: 'Ex: 50 minutos' },
      { key: 'booking_url', label: 'Link de agendamento', placeholder: 'Ex: https://calendly.com/...' },
    ],
  },
  {
    id: 'custom',
    category: 'products',
    template: 'product_service',
    label: 'Outro',
    icon: 'solar:pen-bold',
    description: 'Personalizado',
    capabilities: [],
    showCapabilities: true,
    fields: [
      { key: 'name', label: 'Nome', placeholder: 'Ex: Meu produto ou serviço', required: true },
      { key: 'description', label: 'Descrição', placeholder: 'Descreva o que é...', multiline: true },
      { key: 'price', label: 'Preço', placeholder: 'Ex: R$ 99,00 ou Sob consulta' },
      { key: 'checkout_url', label: 'Link de compra', placeholder: 'Ex: https://...' },
    ],
  },
];

// Capability definitions
const CAPABILITIES = {
  stockable: {
    label: 'Controle de estoque',
    description: 'Quantidade disponível para venda',
    icon: 'solar:box-bold',
    color: '#2065D1',
  },
  schedulable: {
    label: 'Agendável',
    description: 'Horários, vagas ou reservas',
    icon: 'solar:calendar-bold',
    color: '#2065D1',
  },
};

// ----------------------------------------------------------------------

export function ProductServiceFormModal({
  open,
  onClose,
  onSave,
  entity = null,
  loading = false,
}) {
  const isEditing = Boolean(entity);

  // Navigation state
  const [selectedType, setSelectedType] = useState(null);

  // Form state
  const [fieldValues, setFieldValues] = useState({});
  const [whenToMention, setWhenToMention] = useState('');
  const [customFields, setCustomFields] = useState([]);
  const [capabilities, setCapabilities] = useState([]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      if (isEditing && entity) {
        // Find the type from entity template
        const foundType = PRODUCT_TYPES.find((t) => t.template === entity.template) || PRODUCT_TYPES[3]; // fallback to custom

        setSelectedType(foundType);

        // Populate field values
        const values = { name: entity.name || '', description: entity.description || '' };
        if (entity.data) {
          Object.assign(values, entity.data);
        }
        setFieldValues(values);
        setWhenToMention(entity.data?.whenToMention || '');
        setCapabilities(entity.capabilities || []);

        // Extract custom fields
        const knownKeys = [
          'name', 'description', 'price', 'stock_quantity', 'shipping_time',
          'checkout_url', 'access_info', 'duration', 'billing_cycle', 'booking_url',
          'event_date', 'location', 'whenToMention'
        ];
        const custom = [];
        if (entity.data) {
          Object.entries(entity.data).forEach(([key, value]) => {
            if (!knownKeys.includes(key) && value) {
              custom.push({ key, value });
            }
          });
        }
        setCustomFields(custom);
      } else {
        setSelectedType(null);
        setFieldValues({});
        setWhenToMention('');
        setCustomFields([]);
        setCapabilities([]);
      }
    }
  }, [open, isEditing, entity]);

  // Handlers
  const handleSelectType = (type) => {
    setSelectedType(type);
    setCapabilities(type.capabilities || []);
  };

  const handleBack = () => {
    setSelectedType(null);
    setCapabilities([]);
  };

  const handleFieldChange = (key, value) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddCustomField = () => {
    setCustomFields((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleCustomFieldChange = (index, field, value) => {
    setCustomFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveCustomField = (index) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleCapability = (cap) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build data object
    const data = { ...fieldValues, whenToMention };
    customFields.forEach((cf) => {
      if (cf.key && cf.value) {
        data[cf.key] = cf.value;
      }
    });

    onSave({
      id: entity?.id,
      name: fieldValues.name || 'Produto/Serviço',
      category: selectedType.category,
      template: selectedType.template,
      description: fieldValues.description || null,
      data,
      capabilities,
    });
  };

  const canSubmit = fieldValues.name?.trim();

  // ----------------------------------------------------------------------
  // TYPE PICKER (single level)
  // ----------------------------------------------------------------------
  if (!selectedType) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Tipo de produto ou serviço
          </Typography>
          <Stack spacing={1.5}>
            {PRODUCT_TYPES.map((type) => (
              <OptionCard
                key={type.id}
                option={type}
                color={PRODUCT_COLOR}
                onClick={() => handleSelectType(type)}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ----------------------------------------------------------------------
  // FORM
  // ----------------------------------------------------------------------
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          {/* Header */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            {!isEditing && (
              <IconButton onClick={handleBack} size="small" sx={{ ml: -1 }}>
                <Iconify icon="eva:arrow-back-fill" />
              </IconButton>
            )}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${PRODUCT_COLOR}15`,
              }}
            >
              <Iconify icon={selectedType.icon} width={20} sx={{ color: PRODUCT_COLOR }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {selectedType.label}
            </Typography>
          </Stack>

          {/* Show implicit capabilities as read-only badges (not for "Outro") */}
          {!selectedType.showCapabilities && selectedType.capabilities?.length > 0 && (
            <Stack spacing={1} sx={{ mb: 2.5 }}>
              {selectedType.capabilities.map((capKey) => {
                const cap = CAPABILITIES[capKey];
                if (!cap) return null;
                return (
                  <Box
                    key={capKey}
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: `${cap.color}40`,
                      bgcolor: `${cap.color}08`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${cap.color}15`,
                      }}
                    >
                      <Iconify icon={cap.icon} width={20} sx={{ color: cap.color }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {cap.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {cap.description}
                      </Typography>
                    </Box>
                    <Iconify icon="eva:checkmark-circle-2-fill" width={20} sx={{ color: cap.color }} />
                  </Box>
                );
              })}
            </Stack>
          )}

          <Stack spacing={2.5}>
            {/* Type-specific fields */}
            {selectedType.fields.map((field) => (
              <TextField
                key={field.key}
                fullWidth
                label={field.label}
                placeholder={field.placeholder}
                value={fieldValues[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                multiline={field.multiline}
                rows={field.multiline ? 3 : 1}
                required={field.required}
                autoFocus={field.key === 'name'}
              />
            ))}

            {/* Capabilities - only show for types with showCapabilities: true */}
            {selectedType.showCapabilities && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Funcionalidades
                </Typography>
                <Stack spacing={1}>
                  {Object.entries(CAPABILITIES).map(([key, cap]) => (
                    <CapabilityCard
                      key={key}
                      capKey={key}
                      cap={cap}
                      enabled={capabilities.includes(key)}
                      onToggle={() => handleToggleCapability(key)}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* When to mention */}
            <TextField
              fullWidth
              label="Quando falar sobre isso?"
              placeholder="Ex: Quando perguntarem sobre preços"
              value={whenToMention}
              onChange={(e) => setWhenToMention(e.target.value)}
              helperText="Deixe em branco para mencionar quando relevante"
            />

            {/* Custom fields */}
            {customFields.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Campos adicionais
                </Typography>
                <Stack spacing={1}>
                  {customFields.map((cf, index) => (
                    <Stack key={index} direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        placeholder="O que é?"
                        value={cf.key}
                        onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                        sx={{ width: 140 }}
                      />
                      <TextField
                        size="small"
                        placeholder="Informação sobre isso"
                        value={cf.value}
                        onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveCustomField(index)}
                        sx={{ color: 'text.disabled' }}
                      >
                        <Iconify icon="eva:close-fill" width={18} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Add field button */}
            <Button
              size="small"
              color="inherit"
              startIcon={<Iconify icon="eva:plus-fill" width={16} />}
              onClick={handleAddCustomField}
              sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
            >
              Adicionar campo
            </Button>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !canSubmit}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{
              bgcolor: PRODUCT_COLOR,
              '&:hover': { bgcolor: PRODUCT_COLOR, filter: 'brightness(0.9)' },
            }}
          >
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function OptionCard({ option, color, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        transition: 'all 0.15s',
        '&:hover': {
          borderColor: color,
          bgcolor: `${color}08`,
        },
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
          bgcolor: `${color}15`,
        }}
      >
        <Iconify icon={option.icon} width={22} sx={{ color }} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2">{option.label}</Typography>
        {option.description && (
          <Typography variant="caption" color="text.secondary">
            {option.description}
          </Typography>
        )}
      </Box>
      <Iconify icon="eva:chevron-right-fill" sx={{ color: 'text.disabled' }} />
    </Box>
  );
}

// ----------------------------------------------------------------------

function CapabilityCard({ cap, enabled, onToggle }) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: enabled ? `${cap.color}40` : 'divider',
        bgcolor: enabled ? `${cap.color}08` : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        '&:hover': {
          borderColor: enabled ? `${cap.color}60` : 'text.disabled',
          bgcolor: enabled ? `${cap.color}12` : 'action.hover',
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${cap.color}15`,
        }}
      >
        <Iconify icon={cap.icon} width={20} sx={{ color: cap.color }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {cap.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {cap.description}
        </Typography>
      </Box>

      {/* Toggle indicator */}
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '2px solid',
          borderColor: enabled ? cap.color : 'text.disabled',
          bgcolor: enabled ? cap.color : 'transparent',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {enabled && <Iconify icon="eva:checkmark-fill" width={12} sx={{ color: 'white' }} />}
      </Box>
    </Box>
  );
}
