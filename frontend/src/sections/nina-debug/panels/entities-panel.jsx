import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';
import { LinkDialog } from 'src/components/link-dialog';

import { Section, CATEGORY_COLORS } from '../components/shared';

// ----------------------------------------------------------------------

export function EntitiesPanel({ entities, agentId, editMode, onRefresh }) {
  const [editingEntity, setEditingEntity] = useState(null);
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const handleOpenEntityEdit = async (entityId) => {
    try {
      const response = await axios.get(endpoints.entities.details(entityId));
      setEditingEntity(response.data);
      setEntityDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch entity:', error);
    }
  };

  const handleSaveEntity = async () => {
    if (!editingEntity) return;
    try {
      await axios.patch(endpoints.entities.update(editingEntity.id), editingEntity);
      setEntityDialogOpen(false);
      setEditingEntity(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to save entity:', error);
      alert(`Failed to save entity: ${error.message || 'Unknown error'}`);
    }
  };

  const handleLinkDialogClose = () => {
    setLinkDialogOpen(false);
    onRefresh(); // Refresh to get updated links
  };

  if (editMode) {
    return (
      <Stack spacing={2}>
        <Section title="Manage Linked Entities">
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:link-bold" />}
            onClick={() => setLinkDialogOpen(true)}
            fullWidth
          >
            Open Link Manager
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Use the link manager to add or remove entity links
          </Typography>
        </Section>

        <Section title="Edit Entity Content">
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Click an entity to edit its content
          </Typography>
          {entities?.map((entity) => (
            <Box
              key={entity.id}
              onClick={() => handleOpenEntityEdit(entity.id)}
              sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'primary.lighter' } }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>{entity.name}</Typography>
                  <Chip label={entity.category} size="small" sx={{ height: 16, fontSize: 9 }} />
                </Stack>
                <Iconify icon="solar:pen-bold" width={14} />
              </Stack>
            </Box>
          ))}
          {(!entities || entities.length === 0) && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
              No entities linked. Use the Link Manager above to add some.
            </Typography>
          )}
        </Section>

        {/* Link Dialog */}
        <LinkDialog
          open={linkDialogOpen}
          onClose={handleLinkDialogClose}
          initialAgentId={agentId}
        />

        {/* Entity Edit Dialog */}
        <Dialog open={entityDialogOpen} onClose={() => setEntityDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Entity: {editingEntity?.name}</DialogTitle>
          <DialogContent>
            {editingEntity && (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={editingEntity.name || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, name: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Category"
                  value={editingEntity.category || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, category: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Template"
                  value={editingEntity.template || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, template: e.target.value })}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={editingEntity.description || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, description: e.target.value })}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  label="Data (JSON)"
                  value={typeof editingEntity.data === 'string' ? editingEntity.data : JSON.stringify(editingEntity.data || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditingEntity({ ...editingEntity, data: parsed });
                    } catch {
                      // Keep as string if invalid JSON - will show error on save
                    }
                  }}
                  helperText="Edit JSON data for this entity"
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEntityDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEntity}>Save Entity</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  // View mode
  if (!entities || entities.length === 0) return <Typography color="text.secondary">No linked entities</Typography>;

  // Group by category
  const byCategory = {};
  entities.forEach(e => {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  });

  return (
    <Stack spacing={1.5}>
      {/* Category summary */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {Object.entries(byCategory).map(([cat, catEntities]) => (
          <Chip key={cat} label={`${cat}: ${catEntities.length}`} size="small" color={CATEGORY_COLORS[cat] || 'default'} sx={{ height: 18, fontSize: 9 }} />
        ))}
      </Box>

      {entities.map((entity) => (
        <Box key={entity.id} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, borderLeft: 3, borderColor: `${CATEGORY_COLORS[entity.category] || 'grey'}.main` }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>{entity.name}</Typography>
            <Chip label={entity.category} size="small" color={CATEGORY_COLORS[entity.category] || 'default'} sx={{ height: 16, fontSize: 9 }} />
            {entity.category === 'guardrails' && <Chip label="no RAG" size="small" variant="outlined" color="error" sx={{ height: 14, fontSize: 8 }} />}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
            {entity.chunk_count} chunks
          </Typography>
          {entity.capabilities.length > 0 && (
            <Stack direction="row" gap={0.5} sx={{ mt: 0.5 }}>
              {entity.capabilities.map((cap) => (
                <Chip key={cap} label={cap} size="small" color="info" variant="outlined" sx={{ height: 16, fontSize: 9 }} />
              ))}
            </Stack>
          )}
        </Box>
      ))}
    </Stack>
  );
}
