import { memo, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { useAgentForm } from '../agent-form-context';
import { useContactFields } from '../../../contacts/hooks/use-contact-fields';

// ----------------------------------------------------------------------

const NECESSITY_CONFIG = {
  required: {
    label: 'Obrigatório',
    color: '#E53935',
    icon: 'solar:danger-triangle-bold',
    description: 'Agente deve coletar antes de prosseguir',
  },
  recommended: {
    label: 'Recomendado',
    color: '#FB8C00',
    icon: 'solar:star-bold',
    description: 'Agente tenta coletar, mas pode prosseguir',
  },
  optional: {
    label: 'Opcional',
    color: '#43A047',
    icon: 'solar:check-circle-bold',
    description: 'Agente coleta se surgir naturalmente',
  },
};

const FIELD_TYPE_ICONS = {
  text: 'solar:text-bold',
  number: 'solar:calculator-bold',
  select: 'solar:list-bold',
  multi: 'solar:checklist-bold',
  date: 'solar:calendar-bold',
  boolean: 'solar:check-circle-bold',
  phone: 'solar:phone-bold',
  email: 'solar:letter-bold',
};

// ----------------------------------------------------------------------

const FieldConfigItem = memo(({ field, config, onUpdate, onRemove }) => {
  const [showHint, setShowHint] = useState(false);

  const necessityInfo = NECESSITY_CONFIG[config.necessity];

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'grey.200',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={2}>
        {/* Field Icon */}
        <Box
          sx={{
            p: 1,
            borderRadius: 1,
            bgcolor: `${necessityInfo.color}15`,
            color: necessityInfo.color,
          }}
        >
          <Iconify icon={field.icon || FIELD_TYPE_ICONS[field.field_type]} width={20} />
        </Box>

        {/* Field Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2" noWrap>
              {field.label}
            </Typography>
            <Chip
              size="small"
              label={field.field_type}
              sx={{ height: 20, fontSize: 10, textTransform: 'uppercase' }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {field.key}
          </Typography>
        </Box>

        {/* Necessity Selector */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={config.necessity}
            onChange={(e) => onUpdate({ ...config, necessity: e.target.value })}
            sx={{
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              },
            }}
          >
            {Object.entries(NECESSITY_CONFIG).map(([key, info]) => (
              <MenuItem key={key} value={key}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon={info.icon} width={16} sx={{ color: info.color }} />
                  <span>{info.label}</span>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Actions */}
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Dica de coleta">
            <IconButton size="small" onClick={() => setShowHint(!showHint)}>
              <Iconify
                icon={showHint ? 'solar:chat-round-dots-bold' : 'solar:chat-round-dots-linear'}
                width={18}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remover">
            <IconButton size="small" onClick={() => onRemove(field.id)}>
              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Collection Hint (expandable) */}
      {showHint && (
        <TextField
          fullWidth
          size="small"
          multiline
          rows={2}
          placeholder="Ex: Pergunte de forma natural durante a conversa..."
          value={config.collectionHint || ''}
          onChange={(e) => onUpdate({ ...config, collectionHint: e.target.value })}
          sx={{ mt: 2 }}
          helperText="Instrução para o agente sobre como coletar este dado"
        />
      )}
    </Box>
  );
});

// ----------------------------------------------------------------------

const AddFieldMenu = memo(({ availableFields, onAdd }) => {
  const [anchorOpen, setAnchorOpen] = useState(false);

  if (availableFields.length === 0) {
    return (
      <Button
        component={RouterLink}
        href={paths.dashboard.contacts.fields}
        variant="outlined"
        startIcon={<Iconify icon="solar:add-circle-bold" />}
        sx={{ borderStyle: 'dashed' }}
      >
        Criar campos primeiro
      </Button>
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel>Adicionar campo</InputLabel>
      <Select
        label="Adicionar campo"
        value=""
        onChange={(e) => {
          if (e.target.value) {
            onAdd(e.target.value);
          }
        }}
      >
        {availableFields.map((field) => (
          <MenuItem key={field.id} value={field.id}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify
                icon={field.icon || FIELD_TYPE_ICONS[field.field_type]}
                width={18}
                sx={{ color: 'text.secondary' }}
              />
              <span>{field.label}</span>
              <Typography variant="caption" color="text.disabled">
                ({field.key})
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});

// ----------------------------------------------------------------------

export const DataCollectionSection = memo(() => {
  const { fieldConfigs, setFieldConfig, removeFieldConfig } = useAgentForm();
  const { fields, isLoading } = useContactFields();

  // Fields already configured
  const configuredFieldIds = useMemo(
    () => new Set(fieldConfigs.map((c) => c.fieldId)),
    [fieldConfigs]
  );

  // Available fields (not yet added)
  const availableFields = useMemo(
    () => fields.filter((f) => !configuredFieldIds.has(f.id)),
    [fields, configuredFieldIds]
  );

  // Configured fields with full field info
  const configuredFields = useMemo(
    () =>
      fieldConfigs.map((config) => ({
        config,
        field: fields.find((f) => f.id === config.fieldId),
      })).filter((item) => item.field), // Filter out if field was deleted
    [fieldConfigs, fields]
  );

  const handleAddField = (fieldId) => {
    setFieldConfig({
      fieldId,
      necessity: 'recommended',
      collectionHint: '',
    });
  };

  const handleUpdateConfig = (config) => {
    setFieldConfig(config);
  };

  // Stats
  const stats = useMemo(() => {
    const required = fieldConfigs.filter((c) => c.necessity === 'required').length;
    const recommended = fieldConfigs.filter((c) => c.necessity === 'recommended').length;
    const optional = fieldConfigs.filter((c) => c.necessity === 'optional').length;
    return { required, recommended, optional, total: fieldConfigs.length };
  }, [fieldConfigs]);

  return (
    <Stack spacing={3}>
      {/* Summary */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: 'info.lighter',
          border: '1px solid',
          borderColor: 'info.light',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Iconify icon="solar:user-id-bold-duotone" width={24} sx={{ color: 'info.main' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">
              {stats.total} campos configurados
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configure quais dados o agente deve coletar sobre os contatos
            </Typography>
          </Box>
          {stats.total > 0 && (
            <Stack direction="row" spacing={1}>
              {stats.required > 0 && (
                <Chip
                  size="small"
                  label={`${stats.required} obrigatórios`}
                  sx={{ bgcolor: '#E5393515', color: '#E53935' }}
                />
              )}
              {stats.recommended > 0 && (
                <Chip
                  size="small"
                  label={`${stats.recommended} recomendados`}
                  sx={{ bgcolor: '#FB8C0015', color: '#FB8C00' }}
                />
              )}
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Add Field */}
      <Stack direction="row" alignItems="center" spacing={2}>
        <AddFieldMenu availableFields={availableFields} onAdd={handleAddField} />
        <Button
          component={RouterLink}
          href={paths.dashboard.contacts.fields}
          size="small"
          color="inherit"
          startIcon={<Iconify icon="solar:settings-bold" />}
        >
          Gerenciar campos
        </Button>
      </Stack>

      {/* Configured Fields */}
      {configuredFields.length === 0 ? (
        <Box
          sx={{
            py: 6,
            textAlign: 'center',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'grey.300',
            bgcolor: 'grey.50',
          }}
        >
          <Iconify
            icon="solar:clipboard-list-bold-duotone"
            width={48}
            sx={{ color: 'text.disabled', mb: 1 }}
          />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Nenhum campo configurado
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Adicione campos que o agente deve coletar durante conversas
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {configuredFields.map(({ config, field }) => (
            <FieldConfigItem
              key={field.id}
              field={field}
              config={config}
              onUpdate={handleUpdateConfig}
              onRemove={removeFieldConfig}
            />
          ))}
        </Stack>
      )}

      {/* Info box */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.200',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Iconify
            icon="solar:info-circle-bold-duotone"
            width={20}
            sx={{ color: 'info.main', mt: 0.25 }}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              <strong>Como funciona:</strong> O agente coletará estes dados naturalmente durante a
              conversa. Campos obrigatórios serão priorizados, recomendados serão tentados, e
              opcionais só serão coletados se surgirem na conversa.
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
});
