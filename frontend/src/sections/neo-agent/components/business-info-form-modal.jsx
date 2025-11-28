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

const BUSINESS_COLOR = '#7635DC';

// Level 1 options
const LEVEL_1_OPTIONS = [
  {
    id: 'about',
    label: 'Sobre o negócio',
    icon: 'solar:buildings-2-bold',
    description: 'Locais, marca, equipe',
  },
  {
    id: 'how',
    label: 'Como funciona',
    icon: 'solar:document-text-bold',
    description: 'Políticas, processos',
  },
  {
    id: 'other',
    label: 'Outro',
    icon: 'solar:pen-bold',
    description: 'Informação personalizada',
  },
];

// Level 2 options
const LEVEL_2_OPTIONS = {
  about: [
    {
      id: 'location',
      category: 'locations',
      label: 'Local / Endereço',
      icon: 'solar:map-point-bold',
      fields: [
        { key: 'name', label: 'Nome do local', placeholder: 'Ex: Loja Centro' },
        { key: 'address', label: 'Endereço', placeholder: 'Ex: Rua das Flores, 123' },
        { key: 'hours', label: 'Horário de funcionamento', placeholder: 'Ex: Seg-Sex 9h-18h' },
      ],
    },
    {
      id: 'brand',
      category: 'brand',
      label: 'Marca / Identidade',
      icon: 'solar:star-bold',
      fields: [
        { key: 'name', label: 'Nome da marca', placeholder: 'Ex: Pizzaria do João' },
        { key: 'description', label: 'O que faz', placeholder: 'Ex: Pizzaria artesanal desde 2010' },
        { key: 'differentiator', label: 'Diferencial', placeholder: 'Ex: Massa fermentada por 48h' },
      ],
    },
    {
      id: 'people',
      category: 'people',
      label: 'Equipe / Pessoas',
      icon: 'solar:users-group-rounded-bold',
      fields: [
        { key: 'name', label: 'Nome', placeholder: 'Ex: Dr. Maria Silva' },
        { key: 'role', label: 'Cargo / Função', placeholder: 'Ex: Dermatologista' },
        { key: 'specialty', label: 'Especialidade', placeholder: 'Ex: Tratamento de acne' },
      ],
    },
  ],
  how: [
    {
      id: 'policy',
      category: 'policies',
      label: 'Política',
      icon: 'solar:shield-check-bold',
      fields: [
        { key: 'name', label: 'Tipo de política', placeholder: 'Ex: Política de troca' },
        { key: 'description', label: 'Descrição', placeholder: 'Ex: Trocas em até 7 dias com nota fiscal', multiline: true },
      ],
    },
    {
      id: 'process',
      category: 'processes',
      label: 'Processo',
      icon: 'solar:routing-bold',
      fields: [
        { key: 'name', label: 'Nome do processo', placeholder: 'Ex: Como funciona a entrega' },
        { key: 'description', label: 'Como funciona', placeholder: 'Ex: Pedidos feitos até 14h são entregues no mesmo dia...', multiline: true },
      ],
    },
  ],
  other: [
    {
      id: 'custom',
      category: 'custom',
      label: 'Personalizado',
      icon: 'solar:pen-bold',
      fields: [
        { key: 'name', label: 'Título', placeholder: 'Ex: Informação importante' },
        { key: 'description', label: 'Conteúdo', placeholder: 'Descreva a informação...', multiline: true },
      ],
    },
  ],
};

// ----------------------------------------------------------------------

export function BusinessInfoFormModal({
  open,
  onClose,
  onSave,
  entity = null,
  loading = false,
}) {
  const isEditing = Boolean(entity);

  // Navigation state
  const [level1, setLevel1] = useState(null);
  const [level2, setLevel2] = useState(null);

  // Form state
  const [fieldValues, setFieldValues] = useState({});
  const [whenToMention, setWhenToMention] = useState('');
  const [customFields, setCustomFields] = useState([]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      if (isEditing && entity) {
        // Find the type from entity category
        let foundLevel1 = null;
        let foundLevel2 = null;

        Object.entries(LEVEL_2_OPTIONS).forEach(([l1Key, l2Options]) => {
          const match = l2Options.find((opt) => opt.category === entity.category);
          if (match) {
            foundLevel1 = l1Key;
            foundLevel2 = match;
          }
        });

        setLevel1(foundLevel1 || 'other');
        setLevel2(foundLevel2 || LEVEL_2_OPTIONS.other[0]);

        // Populate field values
        const values = { name: entity.name || '', description: entity.description || '' };
        if (entity.data) {
          Object.assign(values, entity.data);
        }
        setFieldValues(values);
        setWhenToMention(entity.data?.whenToMention || '');

        // Extract custom fields
        const knownKeys = ['name', 'description', 'address', 'hours', 'role', 'specialty', 'differentiator', 'whenToMention'];
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
        setLevel1(null);
        setLevel2(null);
        setFieldValues({});
        setWhenToMention('');
        setCustomFields([]);
      }
    }
  }, [open, isEditing, entity]);

  // Handlers
  const handleSelectLevel1 = (option) => {
    setLevel1(option.id);
    // If "other", skip to form
    if (option.id === 'other') {
      setLevel2(LEVEL_2_OPTIONS.other[0]);
    }
  };

  const handleSelectLevel2 = (option) => {
    setLevel2(option);
  };

  const handleBack = () => {
    if (level2 && level1 !== 'other') {
      setLevel2(null);
    } else if (level1) {
      setLevel1(null);
      setLevel2(null);
    }
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
      name: fieldValues.name || 'Informação do negócio',
      category: level2.category,
      template: level2.id,
      description: fieldValues.description || null,
      data,
      capabilities: [],
    });
  };

  const canSubmit = fieldValues.name?.trim();

  // ----------------------------------------------------------------------
  // LEVEL 1: Category picker
  // ----------------------------------------------------------------------
  if (!level1) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Que tipo de informação?
          </Typography>
          <Stack spacing={1.5}>
            {LEVEL_1_OPTIONS.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                color={BUSINESS_COLOR}
                onClick={() => handleSelectLevel1(option)}
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
  // LEVEL 2: Sub-category picker
  // ----------------------------------------------------------------------
  if (!level2) {
    const options = LEVEL_2_OPTIONS[level1] || [];
    const level1Option = LEVEL_1_OPTIONS.find((o) => o.id === level1);

    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            <IconButton onClick={handleBack} size="small" sx={{ ml: -1 }}>
              <Iconify icon="eva:arrow-back-fill" />
            </IconButton>
            <Typography variant="h6">{level1Option?.label}</Typography>
          </Stack>
          <Stack spacing={1.5}>
            {options.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                color={BUSINESS_COLOR}
                onClick={() => handleSelectLevel2(option)}
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
                bgcolor: `${BUSINESS_COLOR}15`,
              }}
            >
              <Iconify icon={level2.icon} width={20} sx={{ color: BUSINESS_COLOR }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {level2.label}
            </Typography>
          </Stack>

          <Stack spacing={2.5}>
            {/* Type-specific fields */}
            {level2.fields.map((field) => (
              <TextField
                key={field.key}
                fullWidth
                label={field.label}
                placeholder={field.placeholder}
                value={fieldValues[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                multiline={field.multiline}
                rows={field.multiline ? 3 : 1}
                required={field.key === 'name'}
                autoFocus={field.key === 'name'}
              />
            ))}

            {/* When to mention */}
            <TextField
              fullWidth
              label="Quando falar sobre isso?"
              placeholder="Ex: Quando perguntarem sobre localização"
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
              bgcolor: BUSINESS_COLOR,
              '&:hover': { bgcolor: BUSINESS_COLOR, filter: 'brightness(0.9)' },
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
