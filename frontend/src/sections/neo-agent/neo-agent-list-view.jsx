import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import axios, { endpoints } from 'src/utils/axios';

import agentSchemas from 'src/assets/data/agent-schemas.json';

// ----------------------------------------------------------------------

export function NeoAgentListView() {
  const navigate = useNavigate();

  // State
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Row menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuAgent, setMenuAgent] = useState(null);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(endpoints.neoAgents?.list || '/api/v1/neo-agents');
      setAgents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      // Mock data for development
      setAgents([
        {
          id: 1,
          name: 'Nina',
          template: 'sales_closer',
          description: 'Agente de vendas do Método Fingerstyle',
          is_active: true,
          channels: ['whatsapp', 'instagram'],
          stats: { conversations: 1234, conversions: 89, satisfaction: 4.8 },
          entities_count: 12,
          created_at: '2024-01-15',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Handlers
  const handleNewAgent = () => {
    setTemplateDialogOpen(true);
  };

  const handleTemplateSelect = (templateId) => {
    setTemplateDialogOpen(false);
    navigate(`${paths.dashboard.neoAgent.new}?template=${templateId}`);
  };

  const handleEdit = (id) => {
    navigate(paths.dashboard.neoAgent.edit(id));
  };

  const handleDuplicate = async (agent) => {
    // TODO: Implement duplicate
    console.log('Duplicate:', agent);
    handleMenuClose();
  };

  const handleToggleActive = async (agent) => {
    // TODO: Implement toggle
    console.log('Toggle active:', agent);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este agente?')) {
      try {
        await axios.delete(`/api/v1/neo-agents/${id}`);
        fetchAgents();
      } catch (error) {
        console.error('Failed to delete agent:', error);
      }
    }
    handleMenuClose();
  };

  const handleMenuOpen = (event, agent) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuAgent(agent);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuAgent(null);
  };

  const getTemplateInfo = (templateId) => {
    return agentSchemas.templates.find((t) => t.id === templateId) || agentSchemas.templates[7];
  };

  const getChannelInfo = (channelId) => {
    return agentSchemas.channels.find((c) => c.id === channelId);
  };

  // Filter agents
  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4">Neo Agents</Typography>
          <Typography variant="body2" color="text.secondary">
            Crie e gerencie agentes de IA para vendas, suporte e mais
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleNewAgent}
        >
          Novo Agente
        </Button>
      </Stack>

      {/* Quick Stats */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(4, 1fr)',
          },
          mb: 4,
        }}
      >
        <Card sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.lighter',
              }}
            >
              <Iconify icon="solar:bot-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant="h4">{agents.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                Agentes
              </Typography>
            </Box>
          </Stack>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'success.lighter',
              }}
            >
              <Iconify icon="solar:check-circle-bold-duotone" width={24} sx={{ color: 'success.main' }} />
            </Box>
            <Box>
              <Typography variant="h4">{agents.filter((a) => a.is_active).length}</Typography>
              <Typography variant="body2" color="text.secondary">
                Ativos
              </Typography>
            </Box>
          </Stack>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'info.lighter',
              }}
            >
              <Iconify icon="solar:chat-round-dots-bold-duotone" width={24} sx={{ color: 'info.main' }} />
            </Box>
            <Box>
              <Typography variant="h4">
                {agents.reduce((acc, a) => acc + (a.stats?.conversations || 0), 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Conversas
              </Typography>
            </Box>
          </Stack>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'warning.lighter',
              }}
            >
              <Iconify icon="solar:star-bold-duotone" width={24} sx={{ color: 'warning.main' }} />
            </Box>
            <Box>
              <Typography variant="h4">
                {(agents.reduce((acc, a) => acc + (a.stats?.satisfaction || 0), 0) / (agents.length || 1)).toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Satisfação
              </Typography>
            </Box>
          </Stack>
        </Card>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Buscar agentes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Agents List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredAgents.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Iconify
            icon="solar:bot-bold-duotone"
            width={64}
            sx={{ color: 'text.disabled', mb: 2 }}
          />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Nenhum agente ainda
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Crie seu primeiro agente de IA usando um template
          </Typography>
          <Button variant="contained" onClick={handleNewAgent}>
            Criar Agente
          </Button>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
          }}
        >
          {filteredAgents.map((agent) => {
            const templateInfo = getTemplateInfo(agent.template);
            return (
              <Card
                key={agent.id}
                onClick={() => handleEdit(agent.id)}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.customShadows?.z16 || '0 16px 32px rgba(0,0,0,0.12)',
                  },
                  opacity: agent.is_active ? 1 : 0.7,
                }}
              >
                {/* Header */}
                <Box sx={{ p: 2.5, pb: 2 }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          bgcolor: `${templateInfo.color}15`,
                          color: templateInfo.color,
                        }}
                      >
                        <Iconify icon={templateInfo.icon} width={28} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{agent.name}</Typography>
                        <Chip
                          label={templateInfo.name}
                          size="small"
                          sx={{
                            mt: 0.5,
                            bgcolor: `${templateInfo.color}15`,
                            color: templateInfo.color,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Switch
                        checked={agent.is_active}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(agent);
                        }}
                        size="small"
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, agent)}
                      >
                        <Iconify icon="eva:more-vertical-fill" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {agent.description || 'Sem descrição'}
                  </Typography>
                </Box>

                {/* Channels */}
                <Box sx={{ px: 2.5, pb: 2 }}>
                  <Stack direction="row" spacing={1}>
                    {agent.channels?.map((channelId) => {
                      const channel = getChannelInfo(channelId);
                      if (!channel) return null;
                      return (
                        <Box
                          key={channelId}
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: `${channel.color}15`,
                          }}
                        >
                          <Iconify icon={channel.icon} width={16} sx={{ color: channel.color }} />
                        </Box>
                      );
                    })}
                    {(!agent.channels || agent.channels.length === 0) && (
                      <Typography variant="caption" color="text.disabled">
                        Nenhum canal configurado
                      </Typography>
                    )}
                  </Stack>
                </Box>

                <Divider />

                {/* Stats */}
                <Box sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Conversas
                      </Typography>
                      <Typography variant="subtitle2">
                        {agent.stats?.conversations?.toLocaleString() || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Conversões
                      </Typography>
                      <Typography variant="subtitle2">
                        {agent.stats?.conversions || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Entidades
                      </Typography>
                      <Typography variant="subtitle2">
                        {agent.entities_count || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Satisfação
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Iconify icon="solar:star-bold" width={14} sx={{ color: 'warning.main' }} />
                        <Typography variant="subtitle2">
                          {agent.stats?.satisfaction?.toFixed(1) || '-'}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Row Action Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            handleEdit(menuAgent?.id);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Iconify icon="solar:pen-bold" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDuplicate(menuAgent)}>
          <ListItemIcon>
            <Iconify icon="solar:copy-bold" />
          </ListItemIcon>
          <ListItemText>Duplicar</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => handleDelete(menuAgent?.id)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Iconify icon="solar:trash-bin-trash-bold" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      {/* Template Selection Dialog */}
      <TemplateSelectionDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        onSelect={handleTemplateSelect}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function TemplateSelectionDialog({ open, onClose, onSelect }) {
  const getCategoryInfo = (categoryId) => {
    return agentSchemas.categories.find((c) => c.id === categoryId);
  };

  // Group templates by category
  const templatesByCategory = agentSchemas.templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {});

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Escolha um Template</Typography>
          <IconButton onClick={onClose} size="small">
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Comece com um template pré-configurado ou crie do zero
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {agentSchemas.categories.map((category) => {
          const templates = templatesByCategory[category.id] || [];
          if (templates.length === 0) return null;

          return (
            <Box key={category.id}>
              {/* Category Header */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'background.neutral',
                  borderLeft: `4px solid ${category.color}`,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon={category.icon} sx={{ color: category.color }} />
                  <Typography variant="subtitle1">{category.name}</Typography>
                </Stack>
              </Box>

              {/* Templates Grid */}
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  p: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                  },
                }}
              >
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    onClick={() => onSelect(template.id)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: `${template.color}08`,
                        borderColor: template.color,
                        transform: 'translateY(-2px)',
                      },
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" spacing={2}>
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: `${template.color}15`,
                          color: template.color,
                        }}
                      >
                        <Iconify icon={template.icon} width={24} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1">{template.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {template.description}
                        </Typography>
                        {template.suggestedEntities?.length > 0 && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                            {template.suggestedEntities.map((entityType) => (
                              <Chip
                                key={entityType}
                                label={entityType}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                              />
                            ))}
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                  </Card>
                ))}
              </Box>

              <Divider />
            </Box>
          );
        })}
      </DialogContent>
    </Dialog>
  );
}
