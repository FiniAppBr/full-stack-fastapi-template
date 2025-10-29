import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import Grid from '@mui/material/Unstable_Grid2';
import { DashboardContent } from 'src/layouts/dashboard';
import axiosInstance from 'src/utils/axios';
import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';
import { fDate, fTime } from 'src/utils/format-time';
import { fNumber, fCurrency } from 'src/utils/format-number';

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
              <Typography variant="h4" color="warning.main">
                {fCurrency(summary.total_cost_usd || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg: {fCurrency(summary.avg_cost_per_conversation || 0)} per conversation
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
              <Typography variant="h4">{summary.total_conversations}</Typography>
              <Typography variant="body2" color="text.secondary">
                {fNumber(summary.total_tokens_used || 0)} tokens
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
              <Typography variant="h4">{summary.avg_duration_seconds.toFixed(2)}s</Typography>
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
                    {fCurrency(summary.avg_cost_per_conversation || 0)}
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tokens per Conversation
                  </Typography>
                  <Typography variant="h5">
                    {fNumber(Math.round(summary.avg_tokens_per_conversation || 0))}
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
              width: 140,
              renderCell: (params) => (
                <Stack spacing={0.5}>
                  <Box component="span" sx={{ typography: 'body2' }}>
                    {fDate(params.value)}
                  </Box>
                  <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
                    {fTime(params.value)}
                  </Box>
                </Stack>
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
              flex: 1,
              minWidth: 200,
              renderCell: (params) => (
                <Typography variant="body2" noWrap title={params.value}>
                  {params.value}
                </Typography>
              ),
            },
            {
              field: 'response',
              headerName: 'Response',
              flex: 1,
              minWidth: 250,
              renderCell: (params) => (
                <Typography variant="body2" noWrap title={params.value}>
                  {params.value}
                </Typography>
              ),
            },
            {
              field: 'intent',
              headerName: 'Intent',
              width: 110,
              align: 'center',
              headerAlign: 'center',
              renderCell: (params) => (
                <Label
                  variant="soft"
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
                >
                  {params.value}
                </Label>
              ),
            },
            {
              field: 'duration_seconds',
              headerName: 'Duration',
              width: 90,
              align: 'right',
              headerAlign: 'right',
              renderCell: (params) => (
                <Typography variant="body2">{params.value.toFixed(2)}s</Typography>
              ),
            },
            {
              field: 'input_tokens',
              headerName: 'In',
              width: 90,
              align: 'right',
              headerAlign: 'right',
              renderCell: (params) => (
                <Typography variant="body2">{fNumber(params.value)}</Typography>
              ),
            },
            {
              field: 'output_tokens',
              headerName: 'Out',
              width: 90,
              align: 'right',
              headerAlign: 'right',
              renderCell: (params) => (
                <Typography variant="body2">{fNumber(params.value)}</Typography>
              ),
            },
            {
              field: 'total_tokens',
              headerName: 'Total',
              width: 90,
              align: 'right',
              headerAlign: 'right',
              renderCell: (params) => (
                <Typography variant="body2">{fNumber(params.value)}</Typography>
              ),
            },
            {
              field: 'token_details',
              headerName: 'Agents',
              width: 80,
              align: 'center',
              headerAlign: 'center',
              renderCell: (params) => {
                const details = params.value || {};
                const breakdown = Object.entries(details)
                  .map(([agent, tokens]) => `${agent}: in=${tokens.input}, out=${tokens.output}, total=${tokens.total}`)
                  .join('\n');
                return (
                  <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{breakdown || 'No data'}</div>}>
                    <Iconify icon="solar:info-circle-bold" width={20} sx={{ cursor: 'help' }} />
                  </Tooltip>
                );
              },
            },
            {
              field: 'estimated_cost_usd',
              headerName: 'Cost',
              width: 100,
              align: 'right',
              headerAlign: 'right',
              renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium" color="warning.main">
                  {fCurrency(params.value || 0)}
                </Typography>
              ),
            },
            {
              field: 'status',
              headerName: 'Status',
              width: 100,
              align: 'center',
              headerAlign: 'center',
              renderCell: (params) => (
                <Label
                  variant="soft"
                  color={params.value === 'completed' ? 'success' : 'error'}
                  sx={{ textTransform: 'capitalize' }}
                >
                  {params.value}
                </Label>
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
