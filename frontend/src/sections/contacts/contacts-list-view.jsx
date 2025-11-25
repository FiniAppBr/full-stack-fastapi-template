import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import axios, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STAGE_COLORS = {
  new: 'info',
  contacted: 'warning',
  qualified: 'success',
  negotiation: 'secondary',
  won: 'success',
  lost: 'error',
};

const STAGE_LABELS = {
  new: 'Novo',
  contacted: 'Em Contato',
  qualified: 'Qualificado',
  negotiation: 'Negociação',
  won: 'Fechado',
  lost: 'Perdido',
};

// Get label for a stage (use mapped label or format the stage key)
const getStageLabel = (stage) => STAGE_LABELS[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Get color for a stage (default to 'default' for unknown stages)
const getStageColor = (stage) => STAGE_COLORS[stage] || 'default';

const SOURCE_ICONS = {
  manual: 'solar:pen-bold',
  agent: 'solar:cpu-bolt-bold',
  whatsapp: 'ic:baseline-whatsapp',
  website: 'solar:globe-bold',
  form: 'solar:document-bold',
};

// ----------------------------------------------------------------------

export function ContactsListView() {
  const navigate = useNavigate();

  // State
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Row menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuContact, setMenuContact] = useState(null);

  // Contact dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContact, setDialogContact] = useState(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(endpoints.contacts.stats);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('skip', page * rowsPerPage);
      params.set('limit', rowsPerPage);
      if (selectedStage) params.set('pipeline_stage', selectedStage);
      if (searchQuery) params.set('search', searchQuery);

      const response = await axios.get(`${endpoints.contacts.list}?${params}`);
      setContacts(response.data.data || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, selectedStage, searchQuery]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Handlers
  const handleStageClick = (stage) => {
    if (stage === selectedStage) {
      setSelectedStage(null);
    } else {
      setSelectedStage(stage);
    }
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event, contact) => {
    setMenuAnchor(event.currentTarget);
    setMenuContact(contact);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuContact(null);
  };

  const handleViewDetails = (contact) => {
    setDialogContact(contact);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleAddToPipeline = async (contact) => {
    try {
      await axios.post(`${endpoints.pipeline}/add-contact?contact_id=${contact.id}`);
      // Navigate to pipeline
      navigate(paths.dashboard.kanban);
    } catch (error) {
      console.error('Failed to add to pipeline:', error);
    }
    handleMenuClose();
  };

  const handleDelete = async (contact) => {
    if (window.confirm(`Tem certeza que deseja excluir ${contact.name}?`)) {
      try {
        await axios.delete(endpoints.contacts.delete(contact.id));
        fetchContacts();
        fetchStats();
      } catch (error) {
        console.error('Failed to delete contact:', error);
      }
    }
    handleMenuClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render stage chips dynamically from backend stats
  const renderStageChips = () => {
    const stages = stats.by_stage || {};
    // Get all stage keys except 'unassigned'
    const stageKeys = Object.keys(stages).filter((key) => key !== 'unassigned');
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {stageKeys.map((key) => (
          <Chip
            key={key}
            label={`${getStageLabel(key)} (${stages[key] || 0})`}
            color={selectedStage === key ? getStageColor(key) : 'default'}
            variant={selectedStage === key ? 'filled' : 'outlined'}
            onClick={() => handleStageClick(key)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
        {stages.unassigned > 0 && (
          <Chip
            label={`Sem Estágio (${stages.unassigned})`}
            color={selectedStage === 'unassigned' ? 'default' : 'default'}
            variant={selectedStage === 'unassigned' ? 'filled' : 'outlined'}
            onClick={() => handleStageClick('unassigned')}
            sx={{ cursor: 'pointer' }}
          />
        )}
      </Stack>
    );
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Contatos</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => setDialogOpen(true)}
        >
          Novo Contato
        </Button>
      </Stack>

      {/* Stats */}
      <Stack direction="row" spacing={2} mb={3}>
        <Card sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="h4">{stats.total || 0}</Typography>
          <Typography variant="body2" color="text.secondary">
            Total de Contatos
          </Typography>
        </Card>
        <Card sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="h4">{(stats.by_stage?.qualified || 0) + (stats.by_stage?.negotiation || 0)}</Typography>
          <Typography variant="body2" color="text.secondary">
            Leads Qualificados
          </Typography>
        </Card>
        <Card sx={{ p: 2, minWidth: 120 }}>
          <Typography variant="h4">{stats.by_source?.agent || 0}</Typography>
          <Typography variant="body2" color="text.secondary">
            Via Agentes IA
          </Typography>
        </Card>
      </Stack>

      {/* Stage Filter */}
      <Box mb={3}>{renderStageChips()}</Box>

      {/* Search and Table */}
      <Card>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2 }}>
          <TextField
            placeholder="Buscar por nome, telefone ou email..."
            value={searchQuery}
            onChange={handleSearchChange}
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contato</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>Estagio</TableCell>
                    <TableCell>Fonte</TableCell>
                    <TableCell>Conversas</TableCell>
                    <TableCell>Ultima Interacao</TableCell>
                    <TableCell align="right">Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhum contato encontrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    contacts.map((contact) => (
                      <TableRow key={contact.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {contact.name?.charAt(0)?.toUpperCase() || '?'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">{contact.name}</Typography>
                              {contact.email && (
                                <Typography variant="body2" color="text.secondary">
                                  {contact.email}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>{contact.phone || '-'}</TableCell>
                        <TableCell>
                          {contact.pipeline_stage ? (
                            <Chip
                              label={STAGE_LABELS[contact.pipeline_stage] || contact.pipeline_stage}
                              color={STAGE_COLORS[contact.pipeline_stage] || 'default'}
                              size="small"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title={contact.source || 'manual'}>
                            <Iconify
                              icon={SOURCE_ICONS[contact.source] || SOURCE_ICONS.manual}
                              width={20}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>{contact.conversation_count || 0}</TableCell>
                        <TableCell>{formatDate(contact.last_interaction_at)}</TableCell>
                        <TableCell align="right">
                          <IconButton onClick={(e) => handleMenuOpen(e, contact)}>
                            <Iconify icon="eva:more-vertical-fill" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Por pagina:"
            />
          </>
        )}
      </Card>

      {/* Row Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => handleViewDetails(menuContact)}>
          <ListItemIcon>
            <Iconify icon="solar:eye-bold" width={20} />
          </ListItemIcon>
          <ListItemText>Ver Detalhes</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAddToPipeline(menuContact)}>
          <ListItemIcon>
            <Iconify icon="solar:widget-add-bold" width={20} />
          </ListItemIcon>
          <ListItemText>Adicionar ao Pipeline</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDelete(menuContact)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Iconify icon="solar:trash-bin-trash-bold" width={20} sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      {/* Contact Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogContact ? 'Detalhes do Contato' : 'Novo Contato'}
        </DialogTitle>
        <DialogContent>
          {dialogContact ? (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Nome
                </Typography>
                <Typography>{dialogContact.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Telefone
                </Typography>
                <Typography>{dialogContact.phone || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography>{dialogContact.email || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Estagio
                </Typography>
                {dialogContact.pipeline_stage ? (
                  <Chip
                    label={STAGE_LABELS[dialogContact.pipeline_stage] || dialogContact.pipeline_stage}
                    color={STAGE_COLORS[dialogContact.pipeline_stage] || 'default'}
                    size="small"
                  />
                ) : (
                  <Typography>-</Typography>
                )}
              </Box>
              {dialogContact.data && Object.keys(dialogContact.data).length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Dados Coletados
                  </Typography>
                  {Object.entries(dialogContact.data).map(([key, value]) => (
                    <Typography key={key} variant="body2">
                      <strong>{key}:</strong> {String(value)}
                    </Typography>
                  ))}
                </Box>
              )}
              {dialogContact.notes && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Notas
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {dialogContact.notes}
                  </Typography>
                </Box>
              )}
              {dialogContact.tags && dialogContact.tags.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Tags
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {dialogContact.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary">
              Contatos sao criados automaticamente quando agentes interagem com novos clientes.
              Use o Pipeline para gerenciar seus leads.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
          {dialogContact && (
            <Button
              variant="contained"
              onClick={() => {
                handleAddToPipeline(dialogContact);
                setDialogOpen(false);
              }}
            >
              Adicionar ao Pipeline
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
