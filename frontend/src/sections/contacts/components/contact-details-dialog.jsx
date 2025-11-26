import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
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

export function ContactDetailsDialog({ open, contact, fields, onClose, onEdit, onBooking }) {
  if (!contact) return null;

  const sourceConfig = SOURCE_CONFIG[contact.source] || SOURCE_CONFIG.manual;

  // Group fields by whether they have values
  const filledFields = fields.filter((f) => contact.data?.[f.key]);
  const emptyFields = fields.filter((f) => !contact.data?.[f.key] && f.show_in_card);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
              fontSize: '1.5rem',
              fontWeight: 600,
            }}
          >
            {contact.name?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{contact.name}</Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
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
              {contact.conversation_count > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {contact.conversation_count} conversas
                </Typography>
              )}
            </Stack>
          </Box>

          <IconButton onClick={onClose} sx={{ alignSelf: 'flex-start' }}>
            <Iconify icon="solar:close-circle-bold" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Core info */}
          <Box>
            <Typography variant="overline" color="text.secondary" gutterBottom>
              Informacoes de Contato
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {contact.phone && (
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                    }}
                  >
                    <Iconify icon="solar:phone-bold" width={20} sx={{ color: 'text.secondary' }} />
                  </Box>
                  <Box>
                    <Typography variant="body2">{contact.phone}</Typography>
                    <Typography variant="caption" color="text.secondary">Telefone</Typography>
                  </Box>
                </Stack>
              )}

              {contact.email && (
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                    }}
                  >
                    <Iconify icon="solar:letter-bold" width={20} sx={{ color: 'text.secondary' }} />
                  </Box>
                  <Box>
                    <Typography variant="body2">{contact.email}</Typography>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                  </Box>
                </Stack>
              )}
            </Stack>
          </Box>

          {/* Custom fields with values */}
          {filledFields.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary" gutterBottom>
                Dados Coletados
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {filledFields.map((field) => (
                  <Stack key={field.key} direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                      }}
                    >
                      <Iconify
                        icon={field.icon || FIELD_TYPE_ICONS[field.field_type] || 'solar:document-bold'}
                        width={20}
                        sx={{ color: 'text.secondary' }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">{String(contact.data[field.key])}</Typography>
                      <Typography variant="caption" color="text.secondary">{field.label}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {/* Empty fields hint */}
          {emptyFields.length > 0 && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                border: (theme) => `1px dashed ${alpha(theme.palette.warning.main, 0.24)}`,
              }}
            >
              <Typography variant="caption" color="warning.dark">
                <strong>Campos nao preenchidos:</strong> {emptyFields.map((f) => f.label).join(', ')}
              </Typography>
            </Box>
          )}

          {/* Tags */}
          {contact.tags?.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary" gutterBottom>
                Tags
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {contact.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}

          {/* Notes */}
          {contact.notes && (
            <Box>
              <Typography variant="overline" color="text.secondary" gutterBottom>
                Notas
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                {contact.notes}
              </Typography>
            </Box>
          )}

          <Divider />

          {/* Metadata */}
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">Criado em</Typography>
              <Typography variant="body2">{formatDate(contact.created_at)}</Typography>
            </Box>
            {contact.last_interaction_at && (
              <Box>
                <Typography variant="caption" color="text.secondary">Ultima interacao</Typography>
                <Typography variant="body2">{formatDate(contact.last_interaction_at)}</Typography>
              </Box>
            )}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Fechar
        </Button>
        <Button
          variant="soft"
          startIcon={<Iconify icon="solar:calendar-add-bold" />}
          onClick={() => onBooking?.(contact)}
        >
          Agendar
        </Button>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:pen-bold" />}
          onClick={() => onEdit?.(contact)}
        >
          Editar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ContactDetailsDialog.propTypes = {
  open: PropTypes.bool,
  contact: PropTypes.object,
  fields: PropTypes.array,
  onClose: PropTypes.func,
  onEdit: PropTypes.func,
  onBooking: PropTypes.func,
};

ContactDetailsDialog.defaultProps = {
  fields: [],
};
