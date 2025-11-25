import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/utils/axios';

import entitySchemasRaw from 'src/assets/data/entity-schemas.json';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const CATEGORY_INFO = entitySchemasRaw.categories.reduce((acc, cat) => {
  acc[cat.id] = { name: cat.name, icon: cat.icon, color: cat.color };
  return acc;
}, {});

// ----------------------------------------------------------------------

export function LinkDialog({ mode, currentLinks = [], onSave, open, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set(currentLinks));
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [saving, setSaving] = useState(false);

  const isEntityMode = mode === 'select-entities';

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(currentLinks));
      setSearchQuery('');
      setCategoryFilter(null);
    }
  }, [open, currentLinks]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      if (isEntityMode) {
        const response = await axios.get(endpoints.entities.list, {
          params: { limit: 500 },
        });
        const data = (response.data?.data || []).filter((item) => item.category !== 'documents');
        setItems(data);
      } else {
        const response = await axios.get(endpoints.neoAgents.list);
        setItems(response.data?.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isEntityMode]);

  useEffect(() => {
    if (open) {
      fetchItems();
    }
  }, [open, fetchItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    if (isEntityMode && categoryFilter) {
      result = result.filter((item) => item.category === categoryFilter);
    }

    return result;
  }, [items, searchQuery, categoryFilter, isEntityMode]);

  // Get unique categories with counts
  const categoriesWithCounts = useMemo(() => {
    if (!isEntityMode) return [];
    const catCounts = {};
    items.forEach((item) => {
      if (item.category) {
        catCounts[item.category] = (catCounts[item.category] || 0) + 1;
      }
    });
    return Object.entries(catCounts).map(([id, count]) => ({
      id,
      count,
      info: CATEGORY_INFO[id] || { name: id, color: '#757575', icon: 'solar:widget-bold' },
    }));
  }, [items, isEntityMode]);

  const handleToggle = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAllVisible = () => {
    const newSelected = new Set(selectedIds);
    filteredItems.forEach((item) => newSelected.add(item.id));
    setSelectedIds(newSelected);
  };

  const handleDeselectAllVisible = () => {
    const newSelected = new Set(selectedIds);
    filteredItems.forEach((item) => newSelected.delete(item.id));
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selectedIds));
      onClose();
    } catch (error) {
      console.error('Failed to save links:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selectedIds.size;
  const hasChanges =
    JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...currentLinks].sort());

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      {/* Header */}
      <DialogTitle sx={{ pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            {isEntityMode ? 'Vincular Entidades' : 'Vincular Agentes'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Search */}
        <Box sx={{ px: 3, pb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={isEntityMode ? 'Buscar entidades...' : 'Buscar agentes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:magnifer-bold" width={18} sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <Iconify icon="eva:close-fill" width={16} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Category filter chips (entities only) */}
        {isEntityMode && categoriesWithCounts.length > 0 && (
          <Box sx={{ px: 3, pb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label="Todos"
                variant={categoryFilter === null ? 'filled' : 'outlined'}
                onClick={() => setCategoryFilter(null)}
                sx={{
                  height: 32,
                  fontWeight: 500,
                  ...(categoryFilter === null && {
                    bgcolor: 'text.primary',
                    color: 'background.paper',
                  }),
                }}
              />
              {categoriesWithCounts.map(({ id, count, info }) => (
                <Chip
                  key={id}
                  label={`${info.name} (${count})`}
                  variant={categoryFilter === id ? 'filled' : 'outlined'}
                  onClick={() => setCategoryFilter(categoryFilter === id ? null : id)}
                  sx={{
                    height: 32,
                    fontWeight: 500,
                    borderColor: info.color,
                    color: categoryFilter === id ? '#fff' : info.color,
                    ...(categoryFilter === id && {
                      bgcolor: info.color,
                    }),
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Selection toolbar */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 3,
            py: 1.5,
            bgcolor: 'background.neutral',
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={handleSelectAllVisible}>
              Selecionar todos
            </Button>
            <Button size="small" color="inherit" onClick={handleDeselectAllVisible}>
              Desmarcar
            </Button>
          </Stack>
        </Stack>

        {/* Items list */}
        <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : filteredItems.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
              <Typography variant="body2" color="text.secondary">
                {searchQuery
                  ? `Nenhum resultado para "${searchQuery}"`
                  : isEntityMode
                    ? 'Nenhuma entidade encontrada'
                    : 'Nenhum agente encontrado'}
              </Typography>
            </Stack>
          ) : (
            <Stack>
              {filteredItems.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                const catInfo = isEntityMode
                  ? CATEGORY_INFO[item.category] || {
                      name: item.category,
                      color: '#757575',
                      icon: 'solar:widget-bold',
                    }
                  : null;

                return (
                  <Box
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    sx={{
                      px: 3,
                      py: 1.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      borderBottom: index < filteredItems.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      bgcolor: isSelected ? 'rgba(34, 197, 94, 0.04)' : 'transparent',
                      '&:hover': {
                        bgcolor: isSelected ? 'rgba(34, 197, 94, 0.08)' : 'action.hover',
                      },
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      size="small"
                      sx={{ p: 0.5 }}
                    />

                    {/* Icon */}
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isEntityMode ? `${catInfo?.color}15` : 'primary.lighter',
                        flexShrink: 0,
                      }}
                    >
                      <Iconify
                        icon={isEntityMode ? catInfo?.icon : 'solar:bot-bold-duotone'}
                        width={18}
                        sx={{ color: isEntityMode ? catInfo?.color : 'primary.main' }}
                      />
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>
                        {item.name}
                      </Typography>
                      {item.description && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {item.description}
                        </Typography>
                      )}
                    </Box>

                    {/* Category badge (entities only) */}
                    {isEntityMode && catInfo && (
                      <Chip
                        label={catInfo.name}
                        size="small"
                        sx={{
                          height: 22,
                          bgcolor: `${catInfo.color}15`,
                          color: catInfo.color,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* Entity count (agents only) */}
                    {!isEntityMode && item.entities_count !== undefined && (
                      <Typography variant="caption" color="text.secondary">
                        {item.entities_count} entidades
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          startIcon={saving && <CircularProgress size={16} color="inherit" />}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
