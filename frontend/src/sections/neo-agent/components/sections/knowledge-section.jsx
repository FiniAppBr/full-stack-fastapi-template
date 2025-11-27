import { memo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';

import { EntitiesMainView } from 'src/sections/entities-v2';

import { useFormField, useFormActions } from '../agent-form-context';

// ----------------------------------------------------------------------

/**
 * Knowledge section for neo-agent form.
 * Uses embedded entity cards UI in compact mode.
 */
export const KnowledgeSection = memo(({ availableEntities, onOpenPicker }) => {
  const linkedEntities = useFormField('linkedEntities');
  const { setField } = useFormActions();

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => setDialogOpen(true);
  const handleCloseDialog = () => setDialogOpen(false);

  const handleEntitiesChange = (newLinkedIds) => {
    setField('linkedEntities', newLinkedIds);
  };

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="subtitle2">Comportamentos do Agente</Typography>
          <Typography variant="caption" color="text.secondary">
            Configure conhecimento, reacoes, coleta de dados e limites
          </Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          startIcon={<Iconify icon="solar:settings-bold-duotone" />}
          onClick={handleOpenDialog}
        >
          Configurar
        </Button>
      </Stack>

      {/* Summary Cards Preview */}
      <EntitySummaryPreview
        linkedEntities={linkedEntities}
        availableEntities={availableEntities}
        onOpenDialog={handleOpenDialog}
      />

      {/* Full Entity Manager Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh', maxHeight: 700 },
        }}
      >
        <DialogContent sx={{ p: 3 }}>
          <EntitiesMainView
            compact
            linkedEntityIds={linkedEntities}
            onEntitiesChange={handleEntitiesChange}
          />
        </DialogContent>
      </Dialog>
    </Stack>
  );
});

// ----------------------------------------------------------------------

/**
 * Summary preview showing counts by category
 */
function EntitySummaryPreview({ linkedEntities, availableEntities, onOpenDialog }) {
  // Calculate counts by main category
  const counts = {
    conhecimento: 0,
    situacoes: 0,
    coleta: 0,
    limites: 0,
  };

  // Simple categorization based on entity category/template
  linkedEntities.forEach((entityId) => {
    const entity = availableEntities.find((e) => e.id === entityId);
    if (!entity) return;

    const cat = entity.category || entity.template || '';

    if (['products', 'faq', 'documents', 'policies'].includes(cat)) {
      counts.conhecimento += 1;
    } else if (['objection', 'opportunity', 'problem'].includes(cat)) {
      counts.situacoes += 1;
    } else if (cat.startsWith('campo_') || cat === 'collection') {
      counts.coleta += 1;
    } else if (['guardrail', 'escalation', 'limit'].includes(cat)) {
      counts.limites += 1;
    } else {
      counts.conhecimento += 1; // default
    }
  });

  const totalCount = linkedEntities.length;

  if (totalCount === 0) {
    return (
      <Box
        onClick={onOpenDialog}
        sx={{
          p: 4,
          borderRadius: 2,
          border: '2px dashed',
          borderColor: 'divider',
          bgcolor: 'background.neutral',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.lighter',
          },
        }}
      >
        <Iconify
          icon="solar:widget-add-bold-duotone"
          width={48}
          sx={{ color: 'text.disabled', mb: 2 }}
        />
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Nenhum comportamento configurado
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Clique para adicionar conhecimento, objecoes, coleta de dados e mais
        </Typography>
      </Box>
    );
  }

  const categories = [
    {
      id: 'conhecimento',
      title: 'Conhecimento',
      icon: 'solar:book-bold-duotone',
      color: '#5C6BC0',
      count: counts.conhecimento,
    },
    {
      id: 'situacoes',
      title: 'Situacoes',
      icon: 'solar:bolt-bold-duotone',
      color: '#26A69A',
      count: counts.situacoes,
    },
    {
      id: 'coleta',
      title: 'Coleta',
      icon: 'solar:clipboard-list-bold-duotone',
      color: '#FFA726',
      count: counts.coleta,
    },
    {
      id: 'limites',
      title: 'Limites',
      icon: 'solar:shield-check-bold-duotone',
      color: '#EF5350',
      count: counts.limites,
    },
  ];

  return (
    <Box
      onClick={onOpenDialog}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1.5,
        }}
      >
        {categories.map((cat) => (
          <Box
            key={cat.id}
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: cat.count > 0 ? `${cat.color}08` : 'grey.50',
              textAlign: 'center',
            }}
          >
            <Iconify
              icon={cat.icon}
              width={24}
              sx={{
                color: cat.count > 0 ? cat.color : 'text.disabled',
                mb: 0.5,
              }}
            />
            <Typography
              variant="h6"
              sx={{
                color: cat.count > 0 ? cat.color : 'text.disabled',
                fontWeight: 700,
              }}
            >
              {cat.count}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: cat.count > 0 ? 'text.secondary' : 'text.disabled',
                display: 'block',
              }}
            >
              {cat.title}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}
      >
        {totalCount} {totalCount === 1 ? 'item configurado' : 'itens configurados'} • Clique para editar
      </Typography>
    </Box>
  );
}
