import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import Grid from '@mui/material/Unstable_Grid2';
import { DashboardContent } from 'src/layouts/dashboard';
import axiosInstance from 'src/utils/axios';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function AgentAnalyticsView() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axiosInstance.get('/api/v1/agent/analytics');
      setAnalytics(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analytics) {
    return (
      <DashboardContent maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (error && !analytics) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="error">{error}</Alert>
      </DashboardContent>
    );
  }

  const { summary, recent_executions } = analytics;

  // Calculate intent percentages for visual display
  const totalIntents = Object.values(summary.intents || {}).reduce((a, b) => a + b, 0);
  const intentPercentages = Object.entries(summary.intents || {}).map(([intent, count]) => ({
    intent,
    count,
    percentage: totalIntents > 0 ? (count / totalIntents) * 100 : 0,
  }));

  return (
    <DashboardContent maxWidth="xl">
      {/* Top Row: The Money Shot - Cost, Volume, Performance */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid xs={12} sm={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:dollar-bold" width={20} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total Cost
                </Typography>
              </Stack>
              <Typography variant="h3" color="warning.main">
                ${(summary.total_cost_usd || 0).toFixed(6)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg: ${(summary.avg_cost_per_conversation || 0).toFixed(6)} per conversation
              </Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} sm={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:chart-bold" width={20} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total Conversations
                </Typography>
              </Stack>
              <Typography variant="h3">{summary.total_conversations}</Typography>
              <Typography variant="body2" color="text.secondary">
                {summary.total_tokens_used?.toLocaleString() || 0} tokens used
              </Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} sm={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:bolt-bold" width={20} />
                <Typography variant="subtitle2" color="text.secondary">
                  Avg Response Time
                </Typography>
              </Stack>
              <Typography variant="h3">{summary.avg_duration_seconds.toFixed(2)}s</Typography>
              <Typography variant="body2" color="text.secondary">
                {summary.total_conversations > 0 ? 'Operational' : 'No data'}
              </Typography>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Second Row: Customer Intelligence & Efficiency */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Intents */}
        <Grid xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Iconify icon="solar:target-bold" width={20} />
              <Typography variant="h6">Intents</Typography>
            </Stack>
            <Stack spacing={2}>
              {intentPercentages.length > 0 ? (
                intentPercentages
                  .sort((a, b) => b.count - a.count)
                  .map(({ intent, count, percentage }) => (
                    <Box key={intent}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          sx={{ textTransform: 'capitalize' }}
                        >
                          {intent}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {count} ({percentage.toFixed(0)}%)
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          backgroundColor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor:
                              intent === 'question'
                                ? 'primary.main'
                                : intent === 'booking'
                                  ? 'success.main'
                                  : intent === 'complaint'
                                    ? 'error.main'
                                    : 'info.main',
                          },
                        }}
                      />
                    </Box>
                  ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No intent data yet. Start conversations to see patterns.
                </Typography>
              )}
            </Stack>
          </Card>
        </Grid>

        {/* Efficiency */}
        <Grid xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Iconify icon="solar:graph-up-bold" width={20} />
              <Typography variant="h6">Efficiency</Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Cost per Conversation
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    ${(summary.avg_cost_per_conversation || 0).toFixed(6)}
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tokens per Conversation
                  </Typography>
                  <Typography variant="h5">
                    {Math.round(summary.avg_tokens_per_conversation || 0)}
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Model
                  </Typography>
                  <Typography variant="h6">
                    {recent_executions[0]?.model_used || 'gpt-4o-mini'}
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Success Rate
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {(summary.success_rate * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>

      {/* Third Row: Conversation History (DataGrid) */}
      <Card>
        <DataGrid
          rows={recent_executions}
          columns={[
            {
              field: 'created_at',
              headerName: 'Time',
              width: 160,
              valueGetter: (value) => new Date(value),
              renderCell: (params) => (
                <Typography variant="caption">
                  {new Date(params.value).toLocaleString()}
                </Typography>
              ),
            },
            {
              field: 'customer_id',
              headerName: 'Customer',
              width: 140,
            },
            {
              field: 'message',
              headerName: 'Message',
              width: 200,
              renderCell: (params) => (
                <Typography variant="body2" noWrap title={params.value}>
                  {params.value}
                </Typography>
              ),
            },
            {
              field: 'response',
              headerName: 'Response',
              width: 250,
              renderCell: (params) => (
                <Typography variant="body2" noWrap title={params.value}>
                  {params.value}
                </Typography>
              ),
            },
            {
              field: 'intent',
              headerName: 'Intent',
              width: 120,
              renderCell: (params) => (
                <Chip
                  label={params.value}
                  size="small"
                  color={
                    params.value === 'question'
                      ? 'primary'
                      : params.value === 'booking'
                        ? 'success'
                        : params.value === 'complaint'
                          ? 'error'
                          : 'default'
                  }
                  sx={{ textTransform: 'capitalize' }}
                />
              ),
            },
            {
              field: 'duration_seconds',
              headerName: 'Duration',
              width: 90,
              type: 'number',
              renderCell: (params) => `${params.value.toFixed(2)}s`,
            },
            {
              field: 'input_tokens',
              headerName: 'In Tokens',
              width: 100,
              type: 'number',
            },
            {
              field: 'output_tokens',
              headerName: 'Out Tokens',
              width: 100,
              type: 'number',
            },
            {
              field: 'total_tokens',
              headerName: 'Total Tokens',
              width: 110,
              type: 'number',
            },
            {
              field: 'token_details',
              headerName: 'Agent Breakdown',
              width: 200,
              renderCell: (params) => {
                const details = params.value || {};
                const breakdown = Object.entries(details)
                  .map(([agent, tokens]) => `${agent.split('_')[0]}: ${tokens.total}`)
                  .join(', ');
                return (
                  <Typography variant="caption" noWrap title={breakdown}>
                    {breakdown || 'N/A'}
                  </Typography>
                );
              },
            },
            {
              field: 'estimated_cost_usd',
              headerName: 'Cost',
              width: 110,
              type: 'number',
              renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium" color="warning.main">
                  ${params.value?.toFixed(6) || '0.000000'}
                </Typography>
              ),
            },
            {
              field: 'status',
              headerName: 'Status',
              width: 110,
              renderCell: (params) => (
                <Chip
                  label={params.value}
                  size="small"
                  color={params.value === 'completed' ? 'success' : 'error'}
                />
              ),
            },
          ]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25, page: 0 },
            },
            sorting: {
              sortModel: [{ field: 'created_at', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            '& .MuiDataGrid-cell': {
              py: 1.5,
            },
            // Mobile optimization
            '@media (max-width: 600px)': {
              '& .MuiDataGrid-columnHeaders': {
                fontSize: '0.75rem',
              },
              '& .MuiDataGrid-cell': {
                fontSize: '0.75rem',
                py: 1,
              },
            },
          }}
        />
      </Card>
    </DashboardContent>
  );
}
