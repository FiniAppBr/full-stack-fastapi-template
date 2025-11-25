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

/**
 * Universal Link Dialog for linking entities <-> agents
 *
 * @param {string} mode - 'select-entities' or 'select-agents'
 * @param {number[]} currentLinks - Currently linked IDs
 * @param {function} onSave - Callback with selected IDs
 * @param {boolean} open - Dialog open state
 * @param {function} onClose - Close callback
 */
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
        setItems(response.data?.data || []);
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

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    // Category filter (only for entities)
    if (isEntityMode && categoryFilter) {
      result = result.filter((item) => item.category === categoryFilter);
    }

    return result;
  }, [items, searchQuery, categoryFilter, isEntityMode]);

  // Get unique categories for filter chips
  const categories = useMemo(() => {
    if (!isEntityMode) return [];
    const cats = new Set(items.map((item) => item.category).filter(Boolean));
    return Array.from(cats);
  }, [items, isEntityMode]);

  // Toggle selection
  const handleToggle = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all visible
  const handleSelectAll = () => {
    const newSelected = new Set(selectedIds);
    filteredItems.forEach((item) => newSelected.add(item.id));
    setSelectedIds(newSelected);
  };

  // Clear all
  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  // Save
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
  const hasChanges = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...currentLinks].sort());

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify
              icon={isEntityMode ? 'solar:database-bold-duotone' : 'solar:bot-bold-duotone'}
              width={24}
            />
            <Typography variant="h6">
              {isEntityMode ? 'Vincular Entidades' : 'Vincular Agentes'}
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Search and filters */}
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={isEntityMode ? 'Buscar entidades...' : 'Buscar agentes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:magnifer-bold" width={18} />
                </InputAdornment>
              ),
            }}
          />

          {/* Category filter chips (entities only) */}
          {isEntityMode && categories.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label="Todos"
                size="small"
                variant={categoryFilter === null ? 'filled' : 'outlined'}
                onClick={() => setCategoryFilter(null)}
              />
              {categories.map((cat) => {
                const info = CATEGORY_INFO[cat] || { name: cat, color: '#757575' };
                return (
                  <Chip
                    key={cat}
                    label={info.name}
                    size="small"
                    variant={categoryFilter === cat ? 'filled' : 'outlined'}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                    sx={{
                      ...(categoryFilter === cat && {
                        bgcolor: `${info.color}20`,
                        borderColor: info.color,
                        color: info.color,
                      }),
                    }}
                  />
                );
              })}
            </Stack>
          )}
        </Box>

        {/* Selection actions */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1, bgcolor: 'background.neutral' }}
        >
          <Typography variant="body2" color="text.secondary">
            {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={handleSelectAll}>
              Selecionar visíveis
            </Button>
            <Button size="small" color="inherit" onClick={handleClearAll}>
              Limpar
            </Button>
          </Stack>
        </Stack>

        {/* Items list */}
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress />
            </Box>
          ) : filteredItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                {searchQuery
                  ? `Nenhum resultado para "${searchQuery}"`
                  : isEntityMode
                    ? 'Nenhuma entidade encontrada'
                    : 'Nenhum agente encontrado'}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={0}>
              {filteredItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const catInfo = isEntityMode
                  ? CATEGORY_INFO[item.category] || { name: item.category, color: '#757575', icon: 'solar:widget-bold' }
                  : null;

                return (
                  <Box
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isSelected ? 'primary.lighter' : 'transparent',
                      '&:hover': {
                        bgcolor: isSelected ? 'primary.lighter' : 'action.hover',
                      },
                    }}
                  >
                    <Checkbox checked={isSelected} size="small" />

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
                        width={20}
                        sx={{ color: isEntityMode ? catInfo?.color : 'primary.main' }}
                      />
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>
                        {item.name}
                      </Typography>
                      {item.description && (
                        <Typography variant="caption" color="text.secondary" noWrap>
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
                          bgcolor: `${catInfo.color}15`,
                          color: catInfo.color,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    )}

                    {/* Entity count (agents only) */}
                    {!isEntityMode && item.entities_count !== undefined && (
                      <Chip
                        label={`${item.entities_count} entidades`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          startIcon={saving ? <CircularProgress size={16} /> : <Iconify icon="solar:link-bold" />}
        >
          {saving ? 'Salvando...' : 'Salvar vínculos'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
