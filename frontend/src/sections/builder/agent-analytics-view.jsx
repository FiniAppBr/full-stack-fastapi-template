import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import Grid from '@mui/material/Unstable_Grid2';
import { DashboardContent } from 'src/layouts/dashboard';
import axiosInstance from 'src/utils/axios';

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

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 3 }}>
        Agent Analytics
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Row 1: Main metrics */}
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Total Conversations
            </Typography>
            <Typography variant="h3">{summary.total_conversations}</Typography>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Avg Response Time
            </Typography>
            <Typography variant="h3">{summary.avg_duration_seconds.toFixed(2)}s</Typography>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Success Rate
            </Typography>
            <Typography variant="h3" color="success.main">
              {(summary.success_rate * 100).toFixed(1)}%
            </Typography>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Total Tokens
            </Typography>
            <Typography variant="h3">{summary.total_tokens_used?.toLocaleString() || 0}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Avg: {Math.round(summary.avg_tokens_per_conversation || 0)} per conv.
            </Typography>
          </Card>
        </Grid>

        {/* Row 2: Cost and Intent */}
        <Grid xs={12} sm={6} md={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Total Cost
            </Typography>
            <Typography variant="h3" color="warning.main">
              ${(summary.total_cost_usd || 0).toFixed(6)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Avg: ${(summary.avg_cost_per_conversation || 0).toFixed(6)} per conv.
            </Typography>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={8}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Intent Distribution
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {Object.entries(summary.intents || {}).map(([intent, count]) => (
                <Chip
                  key={intent}
                  label={`${intent}: ${count}`}
                  size="medium"
                  color={
                    intent === 'question'
                      ? 'primary'
                      : intent === 'booking'
                        ? 'success'
                        : intent === 'complaint'
                          ? 'error'
                          : 'default'
                  }
                  sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Conversations Table */}
      <Card>
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography variant="h6">Recent Conversations</Typography>
        </Box>

        <DataGrid
          rows={recent_executions}
          columns={[
            {
              field: 'created_at',
              headerName: 'Time',
              width: 180,
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
              width: 150,
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
              width: 130,
              renderCell: (params) => (
                <Box>
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
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    {(params.row.confidence * 100).toFixed(0)}% conf
                  </Typography>
                </Box>
              ),
            },
            {
              field: 'duration_seconds',
              headerName: 'Duration',
              width: 100,
              type: 'number',
              renderCell: (params) => `${params.value.toFixed(2)}s`,
            },
            {
              field: 'total_tokens',
              headerName: 'Tokens',
              width: 150,
              type: 'number',
              renderCell: (params) => (
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    {params.value || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    In: {params.row.input_tokens || 0} / Out: {params.row.output_tokens || 0}
                  </Typography>
                </Box>
              ),
            },
            {
              field: 'estimated_cost_usd',
              headerName: 'Cost',
              width: 120,
              type: 'number',
              renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium" color="warning.main">
                  ${params.value?.toFixed(6) || '0.000000'}
                </Typography>
              ),
            },
            {
              field: 'model_used',
              headerName: 'Model',
              width: 130,
            },
            {
              field: 'status',
              headerName: 'Status',
              width: 120,
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
          }}
        />
      </Card>
    </DashboardContent>
  );
}
