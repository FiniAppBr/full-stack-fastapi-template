import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarQuickFilter,
  GridToolbarExport,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
} from '@mui/x-data-grid';
import Grid from '@mui/material/Unstable_Grid2';
import { DashboardContent } from 'src/layouts/dashboard';
import axiosInstance from 'src/utils/axios';
import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';
import { Chart, useChart } from 'src/components/chart';
import { fDate, fTime } from 'src/utils/format-time';
import { fNumber, fCurrency } from 'src/utils/format-number';

// Custom currency formatter for AI costs (needs more precision)
const fAICost = (value) => fCurrency(value, { minimumFractionDigits: 4, maximumFractionDigits: 6 });

// ----------------------------------------------------------------------

// Stat Card with Sparkline Component
function StatCard({ title, value, icon, trend, color = 'primary', onClick, children }) {
  const theme = useTheme();

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: [theme.palette[color].main],
    stroke: { width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          { offset: 0, color: theme.palette[color].main, opacity: 0.4 },
          { offset: 100, color: theme.palette[color].main, opacity: 0.1 },
        ],
      },
    },
    tooltip: {
      y: { formatter: (val) => fNumber(val) },
    },
  });

  return (
    <Card
      sx={{
        p: 3,
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': onClick ? {
          boxShadow: theme.shadows[8],
          transform: 'translateY(-2px)',
        } : {},
      }}
      onClick={onClick}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <Box sx={{ flexGrow: 1 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon={icon} width={20} />
                <Typography variant="subtitle2" color="text.secondary">
                  {title}
                </Typography>
              </Stack>
              <Typography variant="h3" color={`${color}.main`}>
                {value}
              </Typography>
            </Stack>
          </Box>
          {trend && trend.length > 0 && (
            <Box sx={{ width: 80, display: 'flex', alignItems: 'center' }}>
              <Chart
                type="area"
                series={[{ data: trend }]}
                options={chartOptions}
                height={60}
              />
            </Box>
          )}
        </Stack>
        {children && (
          <Box sx={{ pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
            {children}
          </Box>
        )}
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

// Custom Toolbar Component
function CustomToolbar({ setFilterButtonEl }) {
  return (
    <GridToolbarContainer sx={{ p: 2, gap: 1 }}>
      <GridToolbarQuickFilter sx={{ flex: 1 }} />
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton ref={setFilterButtonEl} />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
}

// ----------------------------------------------------------------------

export function AgentAnalyticsView() {
  const theme = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIntent, setSelectedIntent] = useState(null); // For filtering table
  const [costModalOpen, setCostModalOpen] = useState(false); // For cost breakdown modal
  const [filterButtonEl, setFilterButtonEl] = useState(null); // For filter panel positioning

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

  // Filter conversations by selected intent
  const filteredExecutions = selectedIntent
    ? recent_executions.filter((exec) => exec.intent === selectedIntent)
    : recent_executions;

  return (
    <DashboardContent maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* Single Row: All Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Cost Card - with detailed breakdown */}
        <Grid xs={12} md={4}>
          <StatCard
            title="Total Cost"
            value={fAICost(summary.total_cost_usd || 0)}
            icon="solar:dollar-bold"
            trend={summary.cost_trend}
            color="warning"
            onClick={() => setCostModalOpen(true)}
          >
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Avg per conversation: {fAICost(summary.avg_cost_per_conversation || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total tokens: {fNumber(summary.total_tokens_used || 0)}
              </Typography>
              {intentPercentages.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Top intent: {intentPercentages[0].intent} ({intentPercentages[0].percentage.toFixed(0)}%)
                </Typography>
              )}
            </Stack>
          </StatCard>
        </Grid>

        {/* Conversations & Intents Card */}
        <Grid xs={12} md={4}>
          <StatCard
            title="Conversations"
            value={fNumber(summary.total_conversations)}
            icon="solar:chat-round-bold"
            trend={summary.conversations_trend}
            color="primary"
          >
            <Stack spacing={1}>
              {intentPercentages.length > 0 ? (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                    Click to filter by intent:
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {intentPercentages.slice(0, 4).map(({ intent, count, percentage }) => (
                      <Chip
                        key={intent}
                        label={`${intent} (${percentage.toFixed(0)}%)`}
                        size="small"
                        variant={selectedIntent === intent ? 'filled' : 'soft'}
                        color={selectedIntent === intent ? 'primary' : 'default'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIntent(selectedIntent === intent ? null : intent);
                        }}
                        onDelete={selectedIntent === intent ? () => setSelectedIntent(null) : undefined}
                        sx={{
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          '&:hover': { opacity: 0.8 }
                        }}
                      />
                    ))}
                  </Stack>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No conversations yet
                </Typography>
              )}
            </Stack>
          </StatCard>
        </Grid>

        {/* Performance Card */}
        <Grid xs={12} md={4}>
          <StatCard
            title="Avg Response Time"
            value={`${summary.avg_duration_seconds.toFixed(2)}s`}
            icon="solar:bolt-bold"
            trend={summary.response_time_trend}
            color="primary"
          >
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Avg tokens/conversation: {fNumber(Math.round(summary.avg_tokens_per_conversation || 0))}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Success rate: {(summary.success_rate * 100).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Model: {recent_executions[0]?.model_used || 'gpt-4o-mini'}
              </Typography>
            </Stack>
          </StatCard>
        </Grid>
      </Grid>

      {/* Conversation History (DataGrid) */}
      <Card
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: 0, // Important: allows flex to work properly
        }}
      >
        <DataGrid
          rows={filteredExecutions}
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
              field: 'total_tokens',
              headerName: 'Tokens',
              width: 100,
              align: 'right',
              headerAlign: 'right',
              renderCell: (params) => {
                const row = params.row;
                return (
                  <Tooltip
                    title={
                      <Stack spacing={0.5}>
                        <Typography variant="caption">Input: {fNumber(row.input_tokens)}</Typography>
                        <Typography variant="caption">Output: {fNumber(row.output_tokens)}</Typography>
                      </Stack>
                    }
                  >
                    <Typography variant="body2" sx={{ cursor: 'help' }}>
                      {fNumber(params.value)}
                    </Typography>
                  </Tooltip>
                );
              },
            },
            {
              field: 'estimated_cost_usd',
              headerName: 'Cost',
              width: 120,
              align: 'right',
              headerAlign: 'right',
              renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium" color="warning.main">
                  {fAICost(params.value || 0)}
                </Typography>
              ),
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
              field: 'customer_id',
              headerName: 'Customer',
              width: 140,
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
                  color="default"
                  sx={{ textTransform: 'capitalize' }}
                >
                  {params.value}
                </Label>
              ),
            },
            {
              field: 'token_details',
              headerName: 'Agents',
              width: 100,
              align: 'center',
              headerAlign: 'center',
              renderCell: (params) => {
                const details = params.value || {};
                const agentCount = Object.keys(details).length;
                const breakdown = Object.entries(details)
                  .map(([agent, tokens]) => {
                    // knowledge_retriever only has embedding_tokens, others have total
                    const tokenCount = tokens.embedding_tokens || tokens.total || 0;
                    return `${agent}: ${fNumber(tokenCount)} tokens`;
                  })
                  .join('\n');
                return agentCount > 0 ? (
                  <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{breakdown}</div>}>
                    <Chip
                      label={agentCount}
                      size="small"
                      color="default"
                      variant="soft"
                      sx={{ cursor: 'help', minWidth: 40 }}
                    />
                  </Tooltip>
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    -
                  </Typography>
                );
              },
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
          slots={{
            toolbar: CustomToolbar,
          }}
          slotProps={{
            panel: {
              anchorEl: filterButtonEl,
              sx: {
                '& .MuiPaper-root': {
                  backgroundImage: 'none',
                  boxShadow: theme.shadows[20],
                  borderRadius: 1.5,
                },
              },
            },
            columnsPanel: {
              sx: {
                '& .MuiPaper-root': {
                  backgroundImage: 'none',
                  boxShadow: theme.shadows[20],
                  borderRadius: 1.5,
                },
              },
            },
            toolbar: { setFilterButtonEl },
          }}
          sx={{
            '& .MuiDataGrid-cell': {
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
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

      {/* Cost Breakdown Modal */}
      <Dialog
        open={costModalOpen}
        onClose={() => setCostModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="solar:dollar-bold" width={24} />
              <Typography variant="h6">Cost Breakdown</Typography>
            </Stack>
            <IconButton onClick={() => setCostModalOpen(false)}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3}>
            {/* Total Overview */}
            <Box>
              <Typography variant="overline" color="text.secondary">
                Total Cost
              </Typography>
              <Typography variant="h3" color="warning.main">
                {fAICost(summary.total_cost_usd || 0)}
              </Typography>
            </Box>

            {/* Cost by Intent */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Cost by Intent
              </Typography>
              <Stack spacing={2}>
                {intentPercentages.map(({ intent, count }) => {
                  // Calculate cost for this intent from filtered conversations
                  const intentCost = recent_executions
                    .filter((exec) => exec.intent === intent)
                    .reduce((sum, exec) => sum + (exec.estimated_cost_usd || 0), 0);
                  const costPercentage = summary.total_cost_usd > 0
                    ? (intentCost / summary.total_cost_usd) * 100
                    : 0;

                  return (
                    <Stack
                      key={intent}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}
                    >
                      <Stack>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {intent}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {count} conversations
                        </Typography>
                      </Stack>
                      <Stack alignItems="flex-end">
                        <Typography variant="subtitle2" color="warning.main">
                          {fAICost(intentCost)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {costPercentage.toFixed(1)}%
                        </Typography>
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>

            {/* Input vs Output Tokens */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Token Usage
              </Typography>
              <Grid container spacing={2}>
                <Grid xs={6}>
                  <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Input Tokens
                    </Typography>
                    <Typography variant="h5">
                      {fNumber(
                        recent_executions.reduce((sum, exec) => sum + exec.input_tokens, 0)
                      )}
                    </Typography>
                  </Box>
                </Grid>
                <Grid xs={6}>
                  <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Output Tokens
                    </Typography>
                    <Typography variant="h5">
                      {fNumber(
                        recent_executions.reduce((sum, exec) => sum + exec.output_tokens, 0)
                      )}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Top Expensive Conversations */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Most Expensive Conversations
              </Typography>
              <Stack spacing={1}>
                {[...recent_executions]
                  .sort((a, b) => b.estimated_cost_usd - a.estimated_cost_usd)
                  .slice(0, 5)
                  .map((exec) => (
                    <Stack
                      key={exec.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ p: 1.5, bgcolor: 'background.neutral', borderRadius: 1 }}
                    >
                      <Stack sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap>
                          {exec.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {fDate(exec.created_at)} • {exec.customer_id}
                        </Typography>
                      </Stack>
                      <Typography variant="subtitle2" color="warning.main" sx={{ ml: 2 }}>
                        {fAICost(exec.estimated_cost_usd)}
                      </Typography>
                    </Stack>
                  ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </DashboardContent>
  );
}
