import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
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
 * LinkDialog - Universal dialog for linking entities to agents
 *
 * Standalone mode (default): Select agent from dropdown, manage links, saves directly to API
 * Embedded mode: Pass agentId and onSave to use within a form (doesn't save to API)
 */
// Wrapper component that resets internal state via key when dialog opens
export function LinkDialog({ open, ...props }) {
  const [dialogKey, setDialogKey] = useState(0);

  // Increment key when dialog opens to reset all internal state
  useEffect(() => {
    if (open) {
      setDialogKey((k) => k + 1);
    }
  }, [open]);

  return <LinkDialogInner key={dialogKey} open={open} {...props} />;
}

function LinkDialogInner({
  open,
  onClose,
  initialAgentId = null,
  initialEntityId = null,
  // Embedded mode props
  agentId = null,
  currentLinks = [],
  onSave = null,
}) {
  const isEmbeddedMode = agentId !== null && onSave !== null;
  const highlightedRef = useRef(null);

  const [agents, setAgents] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(isEmbeddedMode ? agentId : initialAgentId);
  const [selectedIds, setSelectedIds] = useState(new Set(currentLinks));
  const [originalIds, setOriginalIds] = useState(new Set(currentLinks));
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch agents and entities
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [axios.get(endpoints.entities.list, { params: { limit: 500 } })];
      if (!isEmbeddedMode) {
        requests.unshift(axios.get(endpoints.neoAgents.list));
      }

      const responses = await Promise.all(requests);

      if (isEmbeddedMode) {
        setEntities(responses[0].data?.data || []);
      } else {
        const fetchedAgents = responses[0].data?.data || [];
        setAgents(fetchedAgents);
        setEntities(responses[1].data?.data || []);

        // Auto-select agent if initialEntityId is linked to one
        if (initialEntityId && !initialAgentId) {
          const linkedAgent = fetchedAgents.find((agent) => {
            const linkedEntities = (agent.linked_entities || []).map((id) =>
              typeof id === 'string' ? parseInt(id, 10) : id
            );
            return linkedEntities.includes(initialEntityId);
          });
          if (linkedAgent) {
            setSelectedAgentId(linkedAgent.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setAgents([]);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }, [isEmbeddedMode, initialEntityId, initialAgentId]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  // Scroll to highlighted entity after loading
  useEffect(() => {
    if (!loading && initialEntityId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading, initialEntityId]);

  // Helper to get linked entity IDs for an agent
  const getAgentLinkedIds = useCallback(
    (agentIdToFind) => {
      const agent = agents.find((a) => a.id === agentIdToFind);
      return (agent?.linked_entities || []).map((id) => parseInt(id, 10));
    },
    [agents]
  );

  // Update selections when agent changes (called from event handler, not effect)
  const updateSelectionsForAgent = useCallback(
    (newAgentId) => {
      const linkedIds = getAgentLinkedIds(newAgentId);
      setSelectedIds(new Set(linkedIds));
      setOriginalIds(new Set(linkedIds));
    },
    [getAgentLinkedIds]
  );

  // Sync selections when agents load and we have a selected agent
  useEffect(() => {
    if (!isEmbeddedMode && selectedAgentId && agents.length > 0) {
      updateSelectionsForAgent(selectedAgentId);
    }
    // Only run once when agents first load with a selected agent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.length]);

  // Filter entities
  const filteredEntities = useMemo(() => {
    let result = entities;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter) {
      result = result.filter((item) => item.category === categoryFilter);
    }

    // Sort alphabetically by category, then by name
    result = [...result].sort((a, b) => {
      const catA = (CATEGORY_INFO[a.category]?.name || a.category || '').toLowerCase();
      const catB = (CATEGORY_INFO[b.category]?.name || b.category || '').toLowerCase();
      if (catA !== catB) return catA.localeCompare(catB);
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
    });

    return result;
  }, [entities, searchQuery, categoryFilter]);

  // Get unique categories with counts
  const categoriesWithCounts = useMemo(() => {
    const catCounts = {};
    entities.forEach((item) => {
      if (item.category) {
        catCounts[item.category] = (catCounts[item.category] || 0) + 1;
      }
    });
    return Object.entries(catCounts).map(([id, count]) => ({
      id,
      count,
      info: CATEGORY_INFO[id] || { name: id, color: '#757575', icon: 'solar:widget-bold' },
    }));
  }, [entities]);

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
    filteredEntities.forEach((item) => newSelected.add(item.id));
    setSelectedIds(newSelected);
  };

  const handleDeselectAllVisible = () => {
    const newSelected = new Set(selectedIds);
    filteredEntities.forEach((item) => newSelected.delete(item.id));
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    if (isEmbeddedMode) {
      // Just pass selection back to parent
      onSave(Array.from(selectedIds));
      onClose();
      return;
    }

    // Standalone mode - save to API
    if (!selectedAgentId) return;

    setSaving(true);
    try {
      await axios.patch(endpoints.neoAgents.linkedEntities(selectedAgentId), Array.from(selectedIds));
      // Update local agent state
      setAgents((prev) =>
        prev.map((a) =>
          a.id === selectedAgentId
            ? { ...a, linked_entities: Array.from(selectedIds).map(String) }
            : a
        )
      );
      setOriginalIds(new Set(selectedIds));
    } catch (error) {
      console.error('Failed to save links:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAgentChange = (event) => {
    const newAgentId = event.target.value;
    setSelectedAgentId(newAgentId);
    setSearchQuery('');
    setCategoryFilter(null);
    // Update selections for new agent
    updateSelectionsForAgent(newAgentId);
  };

  const selectedCount = selectedIds.size;
  const hasChanges =
    JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...originalIds].sort());
  const canInteract = isEmbeddedMode || selectedAgentId;

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
            {isEmbeddedMode ? 'Vincular Entidades' : 'Vincular Conhecimento'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, pt: 1 }}>
        {/* Agent Selector (standalone mode only) */}
        {!isEmbeddedMode && (
          <Box sx={{ px: 3, pb: 2, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Agente</InputLabel>
              <Select
                value={selectedAgentId || ''}
                onChange={handleAgentChange}
                label="Agente"
                startAdornment={
                  <InputAdornment position="start">
                    <Iconify icon="solar:bot-bold-duotone" width={20} sx={{ color: 'primary.main', ml: 1 }} />
                  </InputAdornment>
                }
              >
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {agent.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(agent.linked_entities || []).length} vínculos
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Search */}
        <Box sx={{ px: 3, pb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar entidades e documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!canInteract}
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

        {/* Category filter chips */}
        {categoriesWithCounts.length > 0 && (
          <Box sx={{ px: 3, pb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label="Todos"
                variant={categoryFilter === null ? 'filled' : 'outlined'}
                onClick={() => setCategoryFilter(null)}
                sx={{
                  height: 32,
                  fontWeight: 500,
                  cursor: 'pointer',
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
                    cursor: 'pointer',
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
            <Button size="small" onClick={handleSelectAllVisible} disabled={!canInteract}>
              Selecionar todos
            </Button>
            <Button size="small" color="inherit" onClick={handleDeselectAllVisible} disabled={!canInteract}>
              Desmarcar
            </Button>
          </Stack>
        </Stack>

        {/* Items list */}
        <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
          {!canInteract ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
              <Iconify icon="solar:bot-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Selecione um agente para gerenciar vínculos
              </Typography>
            </Stack>
          ) : loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : filteredEntities.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
              <Typography variant="body2" color="text.secondary">
                {searchQuery
                  ? `Nenhum resultado para "${searchQuery}"`
                  : 'Nenhuma entidade encontrada'}
              </Typography>
            </Stack>
          ) : (
            <Stack>
              {filteredEntities.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                const isHighlighted = item.id === initialEntityId;
                const catInfo = CATEGORY_INFO[item.category] || {
                  name: item.category,
                  color: '#757575',
                  icon: 'solar:widget-bold',
                };

                return (
                  <Box
                    key={item.id}
                    ref={isHighlighted ? highlightedRef : null}
                    onClick={() => handleToggle(item.id)}
                    sx={{
                      px: 3,
                      py: 1.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      borderBottom: index < filteredEntities.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      bgcolor: isHighlighted
                        ? 'rgba(33, 150, 243, 0.08)'
                        : isSelected
                          ? 'rgba(34, 197, 94, 0.04)'
                          : 'transparent',
                      '&:hover': {
                        bgcolor: isSelected ? 'rgba(34, 197, 94, 0.08)' : 'action.hover',
                      },
                    }}
                  >
                    <Checkbox checked={isSelected} size="small" sx={{ p: 0.5 }} />

                    {/* Icon */}
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${catInfo.color}15`,
                        flexShrink: 0,
                      }}
                    >
                      <Iconify
                        icon={catInfo.icon}
                        width={18}
                        sx={{ color: catInfo.color }}
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

                    {/* Category badge */}
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
          {isEmbeddedMode ? 'Cancelar' : 'Fechar'}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !hasChanges || !canInteract}
          startIcon={saving && <CircularProgress size={16} color="inherit" />}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
