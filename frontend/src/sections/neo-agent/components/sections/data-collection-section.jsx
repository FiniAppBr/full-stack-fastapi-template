import { memo, useMemo, useState, useCallback } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable, arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

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

function SortableFieldRow({ config, field, isLast, onEditHint, onCycleNecessity, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: config.fieldId });
  const necessityInfo = NECESSITY_OPTIONS.find((n) => n.value === config.necessity) || NECESSITY_OPTIONS[1];

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderBottom: isLast ? 'none' : '1px solid',
        borderColor: 'divider',
        bgcolor: isDragging ? 'action.hover' : 'background.paper',
        opacity: isDragging ? 0.8 : 1,
      }}
    >
      {/* Drag handle */}
      <Box {...attributes} {...listeners} sx={{ cursor: 'grab', color: 'text.disabled', display: 'flex' }}>
        <Iconify icon="solar:hamburger-menu-linear" width={18} />
      </Box>

      {/* Icon + Label */}
      <Iconify icon={field.icon || FIELD_TYPE_ICONS[field.field_type]} width={18} sx={{ color: 'text.secondary' }} />
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }} noWrap>
        {field.label}
      </Typography>

      {/* Hint */}
      <IconButton size="small" onClick={() => onEditHint(config)} sx={{ color: config.collectionHint ? 'info.main' : 'text.disabled' }}>
        <Iconify icon="solar:chat-round-dots-bold" width={18} />
      </IconButton>

      {/* Necessity - click to cycle */}
      <Box
        onClick={() => onCycleNecessity(config)}
        sx={{
          px: 1,
          py: 0.25,
          borderRadius: 1,
          bgcolor: `${necessityInfo.color}15`,
          cursor: 'pointer',
          minWidth: 85,
          textAlign: 'center',
          '&:hover': { bgcolor: `${necessityInfo.color}25` },
        }}
      >
        <Typography variant="caption" sx={{ color: necessityInfo.color, fontWeight: 600 }}>
          {necessityInfo.label}
        </Typography>
      </Box>

      {/* Remove */}
      <IconButton size="small" onClick={() => onRemove(field.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
        <Iconify icon="eva:close-fill" width={18} />
      </IconButton>
    </Box>
  );
}

// ----------------------------------------------------------------------

export const DataCollectionSection = memo(() => {
  const fieldConfigs = useFormField('fieldConfigs');
  const { setFieldConfig, removeFieldConfig, reorderFieldConfigs } = useFormActions();
  const { fields, mutate } = useContactFields();

  const [modalOpen, setModalOpen] = useState(false);
  const [hintDialogOpen, setHintDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [hintValue, setHintValue] = useState('');

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

  const cycleNecessity = useCallback(
    (config) => {
      const order = ['required', 'recommended', 'optional'];
      const currentIdx = order.indexOf(config.necessity);
      const nextIdx = (currentIdx + 1) % order.length;
      setFieldConfig({ ...config, necessity: order[nextIdx] });
    },
    [setFieldConfig]
  );

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

  const handleEditHint = useCallback((config) => {
    setEditingConfig(config);
    setHintValue(config.collectionHint || '');
    setHintDialogOpen(true);
  }, []);

  const handleSaveHint = useCallback(() => {
    if (editingConfig) {
      setFieldConfig({ ...editingConfig, collectionHint: hintValue });
    }
    setHintDialogOpen(false);
    setEditingConfig(null);
  }, [editingConfig, hintValue, setFieldConfig]);

  const editingField = editingConfig ? fields.find((f) => f.id === editingConfig.fieldId) : null;

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
                  onEditHint={handleEditHint}
                  onCycleNecessity={cycleNecessity}
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

      {/* Hint Edit Dialog */}
      <Dialog open={hintDialogOpen} onClose={() => setHintDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dica de coleta: {editingField?.label}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={hintValue}
            onChange={(e) => setHintValue(e.target.value)}
            placeholder="Ex: Pergunte de forma natural no início da conversa..."
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Instrução para o agente sobre como/quando coletar este dado
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHintDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleSaveHint} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
});
