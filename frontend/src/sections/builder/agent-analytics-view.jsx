import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
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
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Total Conversations
            </Typography>
            <Typography variant="h3">{summary.total_conversations}</Typography>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Avg Response Time
            </Typography>
            <Typography variant="h3">{summary.avg_duration_seconds.toFixed(2)}s</Typography>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Success Rate
            </Typography>
            <Typography variant="h3" color="success.main">
              {(summary.success_rate * 100).toFixed(1)}%
            </Typography>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Total Tokens Used
            </Typography>
            <Typography variant="h3">{summary.total_tokens_used?.toLocaleString() || 0}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Avg: {Math.round(summary.avg_tokens_per_conversation || 0)} per conversation
            </Typography>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Total Cost
            </Typography>
            <Typography variant="h3" color="warning.main">
              ${(summary.total_cost_usd || 0).toFixed(6)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Avg: ${(summary.avg_cost_per_conversation || 0).toFixed(6)} per conversation
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Intent Distribution Card */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Intent Distribution</Typography>
        <Stack spacing={1}>
          {Object.entries(summary.intents || {}).map(([intent, count]) => (
            <Box key={intent} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                {intent}
              </Typography>
              <Chip label={count} size="small" />
            </Box>
          ))}
        </Stack>
      </Card>

      {/* Recent Conversations Table */}
      <Card>
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography variant="h6">Recent Conversations</Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Response</TableCell>
                <TableCell>Intent</TableCell>
                <TableCell align="right">Duration</TableCell>
                <TableCell>Tokens</TableCell>
                <TableCell>Cost</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recent_executions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                    <Typography variant="body2" color="text.secondary">
                      No conversations yet. Send a test message to see data here.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                recent_executions.map((execution) => (
                  <TableRow key={execution.id} hover>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(execution.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 100 }}>
                        {execution.customer_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ maxWidth: 200 }}
                        title={execution.message}
                      >
                        {execution.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ maxWidth: 250 }}
                        title={execution.response}
                      >
                        {execution.response}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={execution.intent}
                        size="small"
                        color={
                          execution.intent === 'question'
                            ? 'primary'
                            : execution.intent === 'booking'
                              ? 'success'
                              : execution.intent === 'complaint'
                                ? 'error'
                                : 'default'
                        }
                        sx={{ textTransform: 'capitalize' }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {(execution.confidence * 100).toFixed(0)}% conf
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {execution.duration_seconds.toFixed(2)}s
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {execution.total_tokens || 0}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        In: {execution.input_tokens || 0} / Out: {execution.output_tokens || 0}
                      </Typography>
                      {execution.token_details && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                          {execution.model_used || 'gpt-4o-mini'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" color="warning.main">
                        ${(execution.estimated_cost_usd || 0).toFixed(6)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={execution.status}
                        size="small"
                        color={execution.status === 'completed' ? 'success' : 'error'}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </DashboardContent>
  );
}
