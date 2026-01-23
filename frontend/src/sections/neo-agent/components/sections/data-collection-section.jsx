import { CSS } from '@dnd-kit/utilities';
import { memo, useMemo, useState, useCallback } from 'react';
import { useSensor, DndContext, useSensors, closestCenter, PointerSensor } from '@dnd-kit/core';
import { arrayMove, useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

import { FieldAddModal } from '../field-add-modal';
import { useFormField, useFormActions } from '../agent-form-context';
import { useContactFields } from '../../../contacts/hooks/use-contact-fields';

// ----------------------------------------------------------------------

const NECESSITY_OPTIONS = [
  { value: 'required', label: 'Obrigatório', color: '#0EA5E9' },
  { value: 'recommended', label: 'Recomendado', color: '#22C55E' },
  { value: 'optional', label: 'Opcional', color: '#94A3B8' },
];

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

const FIELD_TYPE_LABELS = {
  text: 'texto',
  number: 'número',
  select: 'seleção',
  multi: 'multi-seleção',
  date: 'data',
  boolean: 'sim/não',
  phone: 'telefone',
  email: 'email',
};

function SortableFieldRow({ config, field, isLast, onUpdateConfig, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: config.fieldId });
  const [hintOpen, setHintOpen] = useState(false);
  const [hintValue, setHintValue] = useState(config.collectionHint || '');

  const handleNecessityChange = (e) => {
    onUpdateConfig({ ...config, necessity: e.target.value });
  };

  const handleHintBlur = () => {
    if (hintValue !== config.collectionHint) {
      onUpdateConfig({ ...config, collectionHint: hintValue });
    }
  };

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        borderBottom: isLast ? 'none' : '1px solid',
        borderColor: 'divider',
        bgcolor: isDragging ? 'action.hover' : 'background.paper',
        opacity: isDragging ? 0.8 : 1,
      }}
    >
      {/* Main row - responsive layout */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1, sm: 1.5 },
          px: { xs: 1, sm: 1.5 },
          py: { xs: 1.5, sm: 1 },
        }}
      >
        {/* Top row on mobile: drag + icon + label + remove */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          {/* Drag handle */}
          <Box
            {...attributes}
            {...listeners}
            sx={{
              cursor: 'grab',
              color: 'text.disabled',
              display: 'flex',
              p: 0.5,
              touchAction: 'none',
            }}
          >
            <Iconify icon="solar:hamburger-menu-linear" width={20} />
          </Box>

          {/* Icon + Label + Type */}
          <Iconify icon={field.icon || FIELD_TYPE_ICONS[field.field_type]} width={18} sx={{ color: 'text.secondary', flexShrink: 0 }} />
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 0.75, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }} noWrap>
              {field.label}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', display: { xs: 'none', sm: 'inline' } }}>
              {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
            </Typography>
          </Box>

          {/* Remove - visible on mobile */}
          <IconButton
            onClick={() => onRemove(field.id)}
            sx={{
              color: 'text.disabled',
              '&:hover': { color: 'error.main' },
              display: { xs: 'flex', sm: 'none' },
              p: 1,
            }}
          >
            <Iconify icon="eva:close-fill" width={18} />
          </IconButton>
        </Box>

        {/* Bottom row on mobile: necessity + hint + remove (desktop) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: { xs: 4, sm: 0 } }}>
          {/* Necessity dropdown */}
          <Select
            size="small"
            value={config.necessity}
            onChange={handleNecessityChange}
            MenuProps={{ disableScrollLock: true }}
            sx={{
              minWidth: { xs: 100, sm: 120 },
              '& .MuiSelect-select': { py: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' }, fontWeight: 600 },
            }}
          >
            {NECESSITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                <Typography variant="caption" sx={{ color: opt.color, fontWeight: 600 }}>
                  {opt.label}
                </Typography>
              </MenuItem>
            ))}
          </Select>

          {/* Hint toggle */}
          <Button
            size="small"
            variant={hintOpen || config.collectionHint ? 'soft' : 'outlined'}
            color={config.collectionHint ? 'info' : 'inherit'}
            onClick={() => setHintOpen(!hintOpen)}
            sx={{
              minWidth: { xs: 'auto', sm: 70 },
              fontSize: '0.7rem',
              px: { xs: 1, sm: 1 },
            }}
          >
            <Iconify icon="solar:chat-round-dots-bold" width={16} sx={{ mr: { xs: 0, sm: 0.5 } }} />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Dica</Box>
          </Button>

          {/* Remove - desktop only */}
          <IconButton
            onClick={() => onRemove(field.id)}
            sx={{
              color: 'text.disabled',
              '&:hover': { color: 'error.main' },
              display: { xs: 'none', sm: 'flex' },
            }}
          >
            <Iconify icon="eva:close-fill" width={18} />
          </IconButton>
        </Box>
      </Box>

      {/* Hint input - collapsible */}
      <Box
        sx={{
          overflow: 'hidden',
          transition: 'all 0.2s ease-in-out',
          maxHeight: hintOpen ? 100 : 0,
          opacity: hintOpen ? 1 : 0,
        }}
      >
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ex: Pergunte de forma natural no início da conversa..."
            value={hintValue}
            onChange={(e) => setHintValue(e.target.value)}
            onBlur={handleHintBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
          />
        </Box>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

export const DataCollectionSection = memo(() => {
  const fieldConfigs = useFormField('fieldConfigs');
  const { setFieldConfig, removeFieldConfig, reorderFieldConfigs } = useFormActions();
  const { fields, mutate } = useContactFields();

  const [modalOpen, setModalOpen] = useState(false);

  const configuredFieldIds = useMemo(
    () => new Set(fieldConfigs.map((c) => c.fieldId)),
    [fieldConfigs]
  );

  const configuredFields = useMemo(
    () =>
      fieldConfigs
        .map((config) => ({
          config,
          field: fields.find((f) => f.id === config.fieldId),
        }))
        .filter((item) => item.field),
    [fieldConfigs, fields]
  );

  const handleAddField = useCallback(
    (fieldId) => {
      setFieldConfig({ fieldId, necessity: 'recommended', collectionHint: '' });
    },
    [setFieldConfig]
  );

  const handleFieldCreated = useCallback(() => {
    mutate();
  }, [mutate]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = fieldConfigs.findIndex((c) => c.fieldId === active.id);
        const newIndex = fieldConfigs.findIndex((c) => c.fieldId === over.id);
        reorderFieldConfigs(arrayMove(fieldConfigs, oldIndex, newIndex));
      }
    },
    [fieldConfigs, reorderFieldConfigs]
  );

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Ordem = prioridade
        </Typography>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<Iconify icon="eva:plus-fill" width={16} />}
          onClick={() => setModalOpen(true)}
          sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover', borderColor: 'text.disabled' },
          }}
        >
          Adicionar
        </Button>
      </Stack>

      {/* Fields table */}
      {configuredFields.length === 0 ? (
        <Box
          onClick={() => setModalOpen(true)}
          sx={{
            py: 4,
            textAlign: 'center',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: 'background.neutral',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { borderColor: 'text.disabled', bgcolor: 'action.hover' },
          }}
        >
          <Iconify icon="solar:user-id-bold-duotone" width={32} sx={{ color: 'text.disabled', mb: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            Clique para adicionar campos
          </Typography>
        </Box>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fieldConfigs.map((c) => c.fieldId)} strategy={verticalListSortingStrategy}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                overflow: 'hidden',
              }}
            >
              {configuredFields.map(({ config, field }, index) => (
                <SortableFieldRow
                  key={field.id}
                  config={config}
                  field={field}
                  isLast={index === configuredFields.length - 1}
                  onUpdateConfig={setFieldConfig}
                  onRemove={removeFieldConfig}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      )}

      {/* Field Add Modal */}
      <FieldAddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        availableFields={fields}
        configuredFieldIds={configuredFieldIds}
        onAddField={handleAddField}
        onFieldCreated={handleFieldCreated}
      />
    </Stack>
  );
});
