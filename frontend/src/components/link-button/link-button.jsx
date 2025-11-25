import { useState } from 'react';

import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

import { useEntityAgentLinks } from 'src/hooks/use-entity-agent-links';

import { Iconify } from 'src/components/iconify';
import { LinkDialog } from 'src/components/link-dialog';

// ----------------------------------------------------------------------

/**
 * LinkButton - Displays entity-agent link status and opens LinkDialog
 *
 * Shows:
 * - "Vincular" if not linked to any agent
 * - Agent name if linked to exactly one agent
 * - "N Agentes" if linked to multiple agents
 */
export function LinkButton({ entityId, size = 'small', variant = 'chip' }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { linkedAgents, loading, refetch } = useEntityAgentLinks(entityId);

  const handleClick = (e) => {
    e.stopPropagation();
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    refetch();
  };

  // Determine label and style
  const count = linkedAgents.length;
  const isLinked = count > 0;

  let label;
  let tooltipTitle = '';

  if (loading) {
    label = <CircularProgress size={12} />;
  } else if (count === 0) {
    label = 'Vincular';
    tooltipTitle = 'Vincular a um agente';
  } else if (count === 1) {
    label = linkedAgents[0].name;
    tooltipTitle = `Vinculado a ${linkedAgents[0].name}`;
  } else {
    label = `${count} Agentes`;
    tooltipTitle = linkedAgents.map((a) => a.name).join(', ');
  }

  const chipContent = (
    <Chip
      label={label}
      size={size}
      icon={<Iconify icon="solar:link-bold" width={14} />}
      onClick={handleClick}
      sx={{
        height: size === 'small' ? 24 : 28,
        cursor: 'pointer',
        fontWeight: 500,
        fontSize: '0.75rem',
        ...(isLinked
          ? {
              bgcolor: 'primary.lighter',
              color: 'primary.dark',
              '& .MuiChip-icon': { color: 'primary.main' },
              '&:hover': { bgcolor: 'primary.light' },
            }
          : {
              bgcolor: 'action.hover',
              color: 'text.secondary',
              '& .MuiChip-icon': { color: 'text.disabled' },
              '&:hover': { bgcolor: 'action.selected' },
            }),
      }}
    />
  );

  return (
    <>
      {tooltipTitle ? (
        <Tooltip title={tooltipTitle} arrow>
          {chipContent}
        </Tooltip>
      ) : (
        chipContent
      )}

      <LinkDialog
        open={dialogOpen}
        onClose={handleClose}
        initialEntityId={entityId}
      />
    </>
  );
}
