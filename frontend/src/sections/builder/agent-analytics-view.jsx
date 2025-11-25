import { useState, useEffect, useCallback } from 'react';

import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';
import {
  Box,
  Card,
  Chip,
  Stack,
  Alert,
  Select,
  MenuItem,
  Typography,
  InputLabel,
  FormControl,
  LinearProgress,
  CircularProgress,
} from '@mui/material';

import axiosInstance, { endpoints } from 'src/utils/axios';
import { fNumber, fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// Custom currency formatter for AI costs (needs more precision)
const fAICost = (value) => fCurrency(value, { minimumFractionDigits: 4, maximumFractionDigits: 6 });

// ----------------------------------------------------------------------

// Stat Card Component
function StatCard({ title, value, subtitle, icon, color = 'primary', trend, trendLabel }) {
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
    <Card sx={{ p: 3, height: '100%' }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Iconify icon={icon} width={20} color={`${color}.main`} />
              <Typography variant="subtitle2" color="text.secondary">
                {title}
              </Typography>
            </Stack>
            <Typography variant="h3">{value}</Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {trend && trend.length > 1 && (
            <Box sx={{ width: 100 }}>
              <Chart
                type="area"
                series={[{ data: trend }]}
                options={chartOptions}
                height={50}
              />
              {trendLabel && (
                <Typography variant="caption" color="text.secondary" align="center" display="block">
                  {trendLabel}
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

// Intent Distribution Card
function IntentCard({ intents, total }) {
  const theme = useTheme();
  const colors = ['primary', 'info', 'warning', 'success', 'error', 'secondary'];

  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        Distribuição de Intenções
      </Typography>
      {intents.length === 0 ? (
        <Typography variant="body2" color="text.disabled">
          Sem dados ainda
        </Typography>
      ) : (
        <Stack spacing={2}>
          {intents.slice(0, 6).map((item, index) => (
            <Box key={item.intent}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {item.intent}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.count} ({item.percentage.toFixed(1)}%)
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={item.percentage}
                color={colors[index % colors.length]}
                sx={{ height: 6, borderRadius: 1 }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  );
}

// Agent Performance Card
function AgentPerformanceCard({ agents, usdToBrl = 5.4 }) {
  const theme = useTheme();

  if (agents.length === 0) {
    return (
      <Card sx={{ p: 3, height: '100%' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Desempenho por Agente
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Sem dados ainda
        </Typography>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        Desempenho por Agente
      </Typography>
      <Stack spacing={2}>
        {agents.map((agent) => (
          <Box
            key={agent.agent_id}
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'background.neutral',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle2">{agent.agent_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {agent.total_conversations} conversas • {agent.total_turns} turnos
                </Typography>
              </Box>
              <Stack alignItems="flex-end">
                <Typography variant="body2" color="warning.main">
                  R$ {(agent.total_cost_usd * usdToBrl).toFixed(4)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {agent.avg_latency_ms}ms média
                </Typography>
              </Stack>
            </Stack>
            {agent.handoff_rate > 0 && (
              <Chip
                label={`${agent.handoff_rate}% handoff`}
                size="small"
                color="warning"
                variant="soft"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        ))}
      </Stack>
    </Card>
  );
}

// Time Series Chart Card
function TimeSeriesCard({ title, data, color = 'primary', valueFormatter = fNumber }) {
  const theme = useTheme();

  const chartOptions = useChart({
    chart: { toolbar: { show: false } },
    colors: [theme.palette[color].main],
    xaxis: {
      categories: data.map((d) => d.date),
      labels: {
        formatter: (val) => {
          if (!val) return '';
          const date = new Date(val);
          return `${date.getDate()}/${date.getMonth() + 1}`;
        },
      },
    },
    yaxis: {
      labels: {
        formatter: valueFormatter,
      },
    },
    tooltip: {
      y: { formatter: valueFormatter },
    },
    stroke: { width: 3, curve: 'smooth' },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
      },
    },
  });

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {data.length > 1 ? (
        <Chart
          type="area"
          series={[{ name: title, data: data.map((d) => d.value) }]}
          options={chartOptions}
          height={200}
        />
      ) : (
        <Box
          sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body2" color="text.disabled">
            Dados insuficientes para gráfico
          </Typography>
        </Box>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

export function AgentAnalyticsView() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [agentId, setAgentId] = useState('');
  const [agents, setAgents] = useState([]);
  const [usdToBrl, setUsdToBrl] = useState(5.4); // fallback rate

  // Fetch agents list and exchange rate
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await axiosInstance.get('/api/v1/neo-agents');
        setAgents(response.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      }
    };
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        setUsdToBrl(data.rates?.BRL || 5.4);
      } catch (err) {
        console.error('Failed to fetch exchange rate:', err);
      }
    };
    fetchAgents();
    fetchExchangeRate();
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const params = { days };
      if (agentId) params.agent_id = agentId;
      const response = await axiosInstance.get(endpoints.analytics.overview, { params });
      setAnalytics(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [days, agentId]);

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

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

  const { overview, tokens_over_time, conversations_over_time, cost_over_time, intent_breakdown, agents: agentStats } = analytics || {};

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Análises</Typography>
          <Typography variant="body2" color="text.secondary">
            Monitore desempenho dos agentes, uso de tokens e custos
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Agente</InputLabel>
            <Select
              value={agentId}
              label="Agente"
              onChange={(e) => setAgentId(e.target.value)}
            >
              <MenuItem value="">Todos os agentes</MenuItem>
              {agents.map((agent) => (
                <MenuItem key={agent.id} value={agent.id}>
                  {agent.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Período</InputLabel>
            <Select
              value={days}
              label="Período"
              onChange={(e) => setDays(e.target.value)}
            >
              <MenuItem value={7}>Últimos 7 dias</MenuItem>
              <MenuItem value={14}>Últimos 14 dias</MenuItem>
              <MenuItem value={30}>Últimos 30 dias</MenuItem>
              <MenuItem value={90}>Últimos 90 dias</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Conversas"
            value={fNumber(overview?.total_conversations || 0)}
            subtitle={`${overview?.avg_turns_per_conversation?.toFixed(1) || 0} turnos em média`}
            icon="solar:chat-round-bold"
            color="primary"
            trend={conversations_over_time?.map((d) => d.value) || []}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Tokens"
            value={fNumber(overview?.total_tokens || 0)}
            subtitle={`${fNumber(overview?.avg_tokens_per_turn || 0)} por turno`}
            icon="solar:graph-new-bold"
            color="info"
            trend={tokens_over_time?.map((d) => d.value) || []}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Custo Total"
            value={`R$ ${((overview?.total_cost_usd || 0) * usdToBrl).toFixed(4)}`}
            subtitle={`US$ ${(overview?.total_cost_usd || 0).toFixed(4)}`}
            icon="solar:dollar-bold"
            color="warning"
            trend={cost_over_time?.map((d) => d.value) || []}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Latência Média"
            value={`${overview?.avg_latency_ms || 0}ms`}
            subtitle={`${overview?.handoff_rate || 0}% taxa de handoff`}
            icon="solar:bolt-bold"
            color="success"
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid xs={12} md={8}>
          <TimeSeriesCard
            title="Uso de Tokens"
            data={tokens_over_time || []}
            color="info"
          />
        </Grid>
        <Grid xs={12} md={4}>
          <IntentCard intents={intent_breakdown || []} total={overview?.total_turns || 0} />
        </Grid>
      </Grid>

      {/* Cost & Agent Performance */}
      <Grid container spacing={3}>
        <Grid xs={12} md={6}>
          <TimeSeriesCard
            title="Custo ao Longo do Tempo (R$)"
            data={(cost_over_time || []).map(d => ({ ...d, value: d.value * usdToBrl }))}
            color="warning"
            valueFormatter={(val) => `R$ ${val.toFixed(4)}`}
          />
        </Grid>
        <Grid xs={12} md={6}>
          <AgentPerformanceCard agents={agentStats || []} usdToBrl={usdToBrl} />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
