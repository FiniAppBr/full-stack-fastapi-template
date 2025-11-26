import PropTypes from 'prop-types';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const SOURCE_CONFIG = {
  manual: { label: 'Manual', icon: 'solar:pen-bold', color: '#637381' },
  agent: { label: 'Agente IA', icon: 'solar:cpu-bolt-bold', color: '#00B8D9' },
  whatsapp: { label: 'WhatsApp', icon: 'ic:baseline-whatsapp', color: '#25D366' },
  website: { label: 'Website', icon: 'solar:globe-bold', color: '#5C6BC0' },
  form: { label: 'Formulário', icon: 'solar:document-bold', color: '#FF9800' },
};

// ----------------------------------------------------------------------

export function ContactCard({ contact, fields, onEdit, onDelete, onViewDetails }) {
  const sourceConfig = SOURCE_CONFIG[contact.source] || SOURCE_CONFIG.manual;

  // Get display fields (fields with values that should be shown)
  const displayFields = fields
    .filter((f) => f.show_in_card && contact.data?.[f.key])
    .slice(0, 3); // Max 3 fields on card

  const lastInteraction = contact.last_interaction_at
    ? formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true, locale: ptBR })
    : null;

  return (
    <Card
      sx={{
        cursor: 'pointer',
        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
        boxShadow: 'none',
        position: 'relative',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.4),
          boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.grey[500], 0.16)}`,
        },
      }}
      onClick={() => onViewDetails?.(contact)}
    >
      {/* Source indicator bar */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: sourceConfig.color,
          borderRadius: '4px 0 0 4px',
        }}
      />

      <CardContent sx={{ p: 2, pl: 2.5, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          {/* Header with avatar and name */}
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {contact.name?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                {contact.name}
              </Typography>
              {contact.phone && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {contact.phone}
                </Typography>
              )}
            </Box>

            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(contact);
              }}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'error.main' },
              }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={16} />
            </IconButton>
          </Stack>

          {/* Contact info */}
          {contact.email && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Iconify icon="solar:letter-bold" width={14} sx={{ color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {contact.email}
              </Typography>
            </Stack>
          )}

          {/* Custom fields */}
          {displayFields.length > 0 && (
            <Stack spacing={0.5}>
              {displayFields.map((field) => (
                <Stack key={field.key} direction="row" alignItems="center" spacing={0.5}>
                  {field.icon && (
                    <Iconify icon={field.icon} width={14} sx={{ color: 'text.secondary' }} />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    <strong>{field.label}:</strong> {contact.data[field.key]}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}

          {/* Tags row */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {/* Source badge */}
            <Tooltip title={sourceConfig.label}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: alpha(sourceConfig.color, 0.12),
                  color: sourceConfig.color,
                }}
              >
                <Iconify icon={sourceConfig.icon} width={14} />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {sourceConfig.label}
                </Typography>
              </Box>
            </Tooltip>

            {/* Conversation count */}
            {contact.conversation_count > 0 && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
                }}
              >
                <Iconify icon="solar:chat-round-dots-bold" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {contact.conversation_count}
                </Typography>
              </Box>
            )}

            {/* Tags */}
            {contact.tags?.slice(0, 2).map((tag) => (
              <Box
                key={tag}
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                  color: 'info.main',
                }}
              >
                <Typography variant="caption">{tag}</Typography>
              </Box>
            ))}
          </Stack>

          {/* Last interaction */}
          {lastInteraction && (
            <Typography variant="caption" color="text.disabled">
              Ultima interacao {lastInteraction}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

ContactCard.propTypes = {
  contact: PropTypes.object.isRequired,
  fields: PropTypes.array,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onViewDetails: PropTypes.func,
};

ContactCard.defaultProps = {
  fields: [],
};
