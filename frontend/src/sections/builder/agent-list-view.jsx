import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';

import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// Mock data - will be replaced with API calls
const MOCK_AGENTS = [
  {
    id: 16,
    name: 'Móveis Premium Assistant',
    description: 'Professional luxury furniture sales assistant with budget qualification',
    status: 'active',
    stats: {
      chatsToday: 47,
      highValueLeads: 12,
      satisfaction: 89,
      avgResponseTime: 6.2,
      handledWithoutHuman: 94,
    },
    tracking: ['Budget', 'Lead Quality', 'Contact Info', 'Competitor'],
    behaviorsActive: 3,
    whatsappConnected: true,
  },
  {
    id: 2,
    name: 'Restaurant Reservations',
    description: 'Handle reservations, menu questions, and availability checks',
    status: 'draft',
    stats: {
      chatsToday: 0,
      highValueLeads: 0,
      satisfaction: null,
      avgResponseTime: null,
      handledWithoutHuman: null,
    },
    tracking: ['Party Size', 'Date', 'Time', 'Dietary Restrictions'],
    behaviorsActive: 2,
    whatsappConnected: false,
  },
];

// ----------------------------------------------------------------------

export function AgentListView() {
  const navigate = useNavigate();
  const [agents] = useState(MOCK_AGENTS);

  const handleNewAgent = useCallback(() => {
    navigate(paths.dashboard.agent.builder);
  }, [navigate]);

  const handleConfigure = useCallback(
    (agentId) => {
      navigate(paths.dashboard.agent.builder);
    },
    [navigate]
  );

  const handleTest = useCallback((agentId) => {
    // Open test chat
    console.log('Test agent:', agentId);
  }, []);

  const handleViewAnalytics = useCallback(
    (agentId) => {
      navigate(paths.dashboard.agent.analytics);
    },
    [navigate]
  );

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 5 }}>
        <Typography variant="h4">AI Agents</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleNewAgent}
        >
          New Agent
        </Button>
      </Stack>

      <Stack spacing={3}>
        {agents.map((agent) => (
          <Card key={agent.id} sx={{ position: 'relative' }}>
            <CardContent>
              {/* Header */}
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {agent.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {agent.description}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={agent.status === 'active' ? 'Active' : 'Draft'}
                    color={agent.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                  {agent.whatsappConnected && (
                    <Chip
                      icon={<Iconify icon="logos:whatsapp-icon" width={16} />}
                      label="Connected"
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  )}
                </Stack>
              </Stack>

              {/* Stats (only for active agents) */}
              {agent.status === 'active' && (
                <Stack spacing={2} sx={{ mb: 3 }}>
                  <Stack direction="row" spacing={3} flexWrap="wrap">
                    <Box>
                      <Typography variant="h4">{agent.stats.chatsToday}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Conversations today
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4" color="error.main">
                        {agent.stats.highValueLeads}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        High-value leads
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4">{agent.stats.satisfaction}%</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Customer satisfaction
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4">{agent.stats.avgResponseTime}s</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Avg response time
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4">{agent.stats.handledWithoutHuman}%</Typography>
                      <Typography variant="caption" color="text.secondary">
                        AI handled
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              )}

              {/* Configuration summary */}
              <Stack spacing={1}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" component="span">
                    Tracking:{' '}
                  </Typography>
                  <Typography variant="body2" component="span">
                    {agent.tracking.join(', ')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" component="span">
                    Smart Behaviors:{' '}
                  </Typography>
                  <Typography variant="body2" component="span">
                    {agent.behaviorsActive} rules active
                  </Typography>
                </Box>
              </Stack>
            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-start', px: 3, pb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:settings-bold" />}
                onClick={() => handleConfigure(agent.id)}
              >
                Configure
              </Button>
              {agent.status === 'active' && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<Iconify icon="solar:chart-2-bold" />}
                    onClick={() => handleViewAnalytics(agent.id)}
                  >
                    Analytics
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
                    onClick={() => handleTest(agent.id)}
                  >
                    Test
                  </Button>
                </>
              )}
              {agent.status === 'draft' && (
                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="solar:play-bold" />}
                  onClick={() => handleConfigure(agent.id)}
                >
                  Finish Setup
                </Button>
              )}
            </CardActions>
          </Card>
        ))}
      </Stack>
    </DashboardContent>
  );
}
