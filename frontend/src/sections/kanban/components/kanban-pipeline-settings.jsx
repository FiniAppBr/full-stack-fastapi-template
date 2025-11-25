import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect, useCallback } from 'react';
import { useSensor, DndContext, useSensors, closestCenter, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, useSortable, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const COLUMN_COLORS = [
  '#00B8D9', // Cyan
  '#36B37E', // Green
  '#FFAB00', // Amber
  '#FF5630', // Red
  '#6554C0', // Purple
  '#00875A', // Dark Green
  '#FF8B00', // Orange
  '#0052CC', // Blue
  '#5243AA', // Violet
  '#172B4D', // Dark
  '#DE350B', // Error Red
  '#006644', // Teal
];

// ----------------------------------------------------------------------

function SortableColumnItem({ column, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveName = () => {
    if (name.trim() && name !== column.name) {
      onUpdate(column.id, { name: name.trim() });
    }
    setIsEditing(false);
  };

  const handleColorChange = (color) => {
    onUpdate(column.id, { color });
    setShowColorPicker(false);
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
        '&:hover': {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.4),
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        {/* Drag handle */}
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', color: 'text.secondary' }}
        >
          <Iconify icon="nimbus:drag-dots" width={20} />
        </IconButton>

        {/* Color picker */}
        <Box sx={{ position: 'relative' }}>
          <IconButton
            size="small"
            onClick={() => setShowColorPicker(!showColorPicker)}
            sx={{
              bgcolor: column.color || '#00B8D9',
              width: 28,
              height: 28,
              '&:hover': {
                bgcolor: column.color || '#00B8D9',
                opacity: 0.8,
              },
            }}
          >
            <Iconify icon="solar:palette-bold" width={16} sx={{ color: 'white' }} />
          </IconButton>

          {showColorPicker && (
            <Box
              sx={{
                position: 'absolute',
                top: '100%',
                left: 0,
                mt: 1,
                p: 1.5,
                zIndex: 10,
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: (theme) => theme.shadows[8],
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 0.5,
              }}
            >
              {COLUMN_COLORS.map((color) => (
                <IconButton
                  key={color}
                  size="small"
                  onClick={() => handleColorChange(color)}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: color,
                    border: column.color === color ? '2px solid white' : 'none',
                    boxShadow: column.color === color ? `0 0 0 2px ${color}` : 'none',
                    '&:hover': { bgcolor: color, opacity: 0.8 },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Column name */}
        <Box sx={{ flex: 1 }}>
          {isEditing ? (
            <TextField
              size="small"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setName(column.name);
                  setIsEditing(false);
                }
              }}
              autoFocus
              InputProps={{
                sx: { fontSize: '0.875rem' },
              }}
            />
          ) : (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              onClick={() => setIsEditing(true)}
              sx={{ cursor: 'pointer' }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: column.color || '#00B8D9',
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {column.name}
              </Typography>
              <Iconify icon="solar:pen-bold" width={14} sx={{ color: 'text.secondary' }} />
            </Stack>
          )}
        </Box>

        {/* Delete button */}
        <IconButton
          size="small"
          onClick={() => onDelete(column.id)}
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'error.main' },
          }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" width={18} />
        </IconButton>
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function KanbanPipelineSettings({ open, onClose, columns, onUpdateColumns }) {
  const [localColumns, setLocalColumns] = useState([]);
  const [newColumnName, setNewColumnName] = useState('');

  // Sync local state when dialog opens or columns change
  useEffect(() => {
    if (open && columns?.length) {
      setLocalColumns(columns);
    }
  }, [open, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setLocalColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleUpdateColumn = useCallback((columnId, updates) => {
    setLocalColumns((items) =>
      items.map((item) => (item.id === columnId ? { ...item, ...updates } : item))
    );
  }, []);

  const handleDeleteColumn = useCallback((columnId) => {
    setLocalColumns((items) => items.filter((item) => item.id !== columnId));
  }, []);

  const handleAddColumn = useCallback(() => {
    if (!newColumnName.trim()) return;

    const newColumn = {
      id: `new-${Date.now()}`,
      name: newColumnName.trim(),
      color: COLUMN_COLORS[localColumns.length % COLUMN_COLORS.length],
      isNew: true,
    };

    setLocalColumns((items) => [...items, newColumn]);
    setNewColumnName('');
  }, [newColumnName, localColumns.length]);

  const handleSave = useCallback(() => {
    onUpdateColumns(localColumns);
    toast.success('Pipeline atualizado!');
    onClose();
  }, [localColumns, onUpdateColumns, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:settings-bold-duotone" width={24} />
          <span>Configurar Pipeline</span>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Info text */}
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Arraste para reordenar as colunas. Clique na cor para alterar.
          </Typography>

          {/* Columns list */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localColumns.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack spacing={1.5}>
                {localColumns.map((column) => (
                  <SortableColumnItem
                    key={column.id}
                    column={column}
                    onUpdate={handleUpdateColumn}
                    onDelete={handleDeleteColumn}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>

          {/* Add new column */}
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              placeholder="Nova coluna..."
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddColumn();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="solar:add-circle-bold" width={20} sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              onClick={handleAddColumn}
              disabled={!newColumnName.trim()}
            >
              Adicionar
            </Button>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
