import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import axios, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATUS_CONFIG = {
  todo: { label: 'A Fazer', color: 'default', icon: 'solar:clipboard-list-bold' },
  in_progress: { label: 'Em Andamento', color: 'info', icon: 'solar:refresh-bold' },
  blocked: { label: 'Bloqueado', color: 'error', icon: 'solar:danger-bold' },
  done: { label: 'Concluído', color: 'success', icon: 'solar:check-circle-bold' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: 'success', icon: 'solar:arrow-down-bold' },
  medium: { label: 'Média', color: 'warning', icon: 'solar:minus-bold' },
  high: { label: 'Alta', color: 'error', icon: 'solar:arrow-up-bold' },
  urgent: { label: 'Urgente', color: 'error', icon: 'solar:danger-triangle-bold' },
};

const TYPE_CONFIG = {
  follow_up: { label: 'Follow-up', icon: 'solar:phone-calling-bold' },
  lead: { label: 'Lead', icon: 'solar:user-plus-bold' },
  support: { label: 'Suporte', icon: 'solar:headphones-round-bold' },
  internal: { label: 'Interno', icon: 'solar:buildings-bold' },
  other: { label: 'Outro', icon: 'solar:document-bold' },
};

// ----------------------------------------------------------------------

export function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (statusFilter === 'pending') {
        params.status = 'todo,in_progress,blocked';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await axios.get(endpoints.scheduling.tasks, { params });
      // API returns { data: [...], count: N }
      const tasksData = response.data?.data || response.data || [];
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Group tasks by status for kanban view
  const groupedTasks = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    blocked: tasks.filter((t) => t.status === 'blocked'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  // Handle status update (drag and drop simulation)
  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await axios.patch(endpoints.scheduling.taskDetails(taskId), {
        status: newStatus,
      });
      await fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Erro ao atualizar tarefa');
    }
  };

  // Handle delete
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      await axios.delete(endpoints.scheduling.taskDetails(taskId));
      await fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Erro ao excluir tarefa');
    }
  };

  if (loading) {
    return (
      <DashboardContent>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Tarefas</Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie tarefas e follow-ups criados pelos agentes de IA
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filtrar</InputLabel>
            <Select
              value={statusFilter}
              label="Filtrar"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="pending">Pendentes</MenuItem>
              <MenuItem value="todo">A Fazer</MenuItem>
              <MenuItem value="in_progress">Em Andamento</MenuItem>
              <MenuItem value="done">Concluídos</MenuItem>
              <MenuItem value="all">Todos</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={() => {
              setSelectedTask({});
              setDialogOpen(true);
            }}
          >
            Nova Tarefa
          </Button>
        </Stack>
      </Stack>

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: 'repeat(4, 1fr)',
          mb: 3,
        }}
      >
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Iconify icon="solar:clipboard-list-bold-duotone" width={40} sx={{ color: 'text.secondary', mb: 1 }} />
            <Typography variant="h4">{groupedTasks.todo.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              A Fazer
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Iconify icon="solar:refresh-bold-duotone" width={40} sx={{ color: 'info.main', mb: 1 }} />
            <Typography variant="h4">{groupedTasks.in_progress.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Em Andamento
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Iconify icon="solar:danger-bold-duotone" width={40} sx={{ color: 'error.main', mb: 1 }} />
            <Typography variant="h4">{groupedTasks.blocked.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Bloqueados
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Iconify icon="solar:check-circle-bold-duotone" width={40} sx={{ color: 'success.main', mb: 1 }} />
            <Typography variant="h4">{groupedTasks.done.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Concluídos
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Kanban Board */}
      <Grid container spacing={2}>
        {['todo', 'in_progress', 'blocked', 'done'].map((status) => {
          const config = STATUS_CONFIG[status];
          const statusTasks = groupedTasks[status];

          // Skip done column if filter is pending
          if (statusFilter === 'pending' && status === 'done') return null;

          return (
            <Grid item xs={12} sm={6} md={3} key={status}>
              <Card variant="outlined" sx={{ bgcolor: 'background.neutral', height: '100%' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Iconify icon={config.icon} width={20} />
                    <Typography variant="subtitle1">{config.label}</Typography>
                    <Chip label={statusTasks.length} size="small" color={config.color} />
                  </Stack>

                  <Stack spacing={1.5}>
                    {statusTasks.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        Nenhuma tarefa
                      </Typography>
                    ) : (
                      statusTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={() => {
                            setSelectedTask(task);
                            setDialogOpen(true);
                          }}
                          onStatusChange={handleStatusUpdate}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Task Edit Dialog */}
      <TaskDialog
        open={dialogOpen}
        task={selectedTask}
        onClose={() => {
          setDialogOpen(false);
          setSelectedTask(null);
        }}
        onSave={fetchTasks}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function TaskCard({ task, onEdit, onStatusChange, onDelete }) {
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const typeConfig = TYPE_CONFIG[task.task_type] || TYPE_CONFIG.other;

  // Due date calculation
  const getDueDateInfo = () => {
    if (!task.due_date) return null;
    const dueDate = parseISO(task.due_date);
    const daysUntil = differenceInDays(dueDate, new Date());

    if (daysUntil < 0) {
      return { label: `Atrasado ${-daysUntil}d`, color: 'error' };
    }
    if (daysUntil === 0) {
      return { label: 'Hoje', color: 'warning' };
    }
    if (daysUntil === 1) {
      return { label: 'Amanhã', color: 'info' };
    }
    return { label: format(dueDate, 'dd/MM'), color: 'default' };
  };

  const dueDateInfo = getDueDateInfo();

  return (
    <Card
      sx={{
        cursor: 'pointer',
        '&:hover': { boxShadow: (theme) => theme.shadows[4] },
        transition: 'box-shadow 0.2s',
      }}
      onClick={onEdit}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              {task.title}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              sx={{ ml: 0.5, mt: -0.5, mr: -0.5 }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={16} />
            </IconButton>
          </Stack>

          {task.customer_name && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Iconify icon="solar:user-bold" width={14} sx={{ color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {task.customer_name}
              </Typography>
            </Stack>
          )}

          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            <Chip
              icon={<Iconify icon={priorityConfig.icon} width={14} />}
              label={priorityConfig.label}
              size="small"
              color={priorityConfig.color}
              variant="soft"
            />
            <Chip
              icon={<Iconify icon={typeConfig.icon} width={14} />}
              label={typeConfig.label}
              size="small"
              variant="outlined"
            />
            {dueDateInfo && (
              <Chip
                icon={<Iconify icon="solar:calendar-bold" width={14} />}
                label={dueDateInfo.label}
                size="small"
                color={dueDateInfo.color}
                variant="soft"
              />
            )}
          </Stack>

          {task.source === 'agent' && (
            <Chip
              icon={<Iconify icon="solar:cpu-bolt-bold" width={14} />}
              label="Agente IA"
              size="small"
              variant="outlined"
              color="primary"
            />
          )}

          {/* Quick status change buttons */}
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
            {task.status !== 'done' && (
              <Button
                size="small"
                variant="soft"
                color="success"
                startIcon={<Iconify icon="solar:check-circle-bold" width={16} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, 'done');
                }}
                sx={{ minWidth: 0, px: 1 }}
              >
                Concluir
              </Button>
            )}
            {task.status === 'todo' && (
              <Button
                size="small"
                variant="soft"
                color="info"
                startIcon={<Iconify icon="solar:play-bold" width={16} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, 'in_progress');
                }}
                sx={{ minWidth: 0, px: 1 }}
              >
                Iniciar
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

function TaskDialog({ open, task, onClose, onSave }) {
  const isNew = !task?.id;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'follow_up',
    priority: 'medium',
    status: 'todo',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    customer_name: '',
    customer_phone: '',
    customer_email: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task?.id) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        task_type: task.task_type || 'follow_up',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        due_date: task.due_date || format(new Date(), 'yyyy-MM-dd'),
        customer_name: task.customer_name || '',
        customer_phone: task.customer_phone || '',
        customer_email: task.customer_email || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        task_type: 'follow_up',
        priority: 'medium',
        status: 'todo',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        customer_name: '',
        customer_phone: '',
        customer_email: '',
      });
    }
  }, [task]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      if (isNew) {
        await axios.post(endpoints.scheduling.tasks, formData);
      } else {
        await axios.patch(endpoints.scheduling.taskDetails(task.id), formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Erro ao salvar tarefa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isNew ? 'Nova Tarefa' : 'Editar Tarefa'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Título"
            value={formData.title}
            onChange={handleChange('title')}
            fullWidth
            required
          />

          <TextField
            label="Descrição"
            value={formData.description}
            onChange={handleChange('description')}
            fullWidth
            multiline
            rows={3}
          />

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={formData.task_type}
                label="Tipo"
                onChange={handleChange('task_type')}
              >
                <MenuItem value="follow_up">Follow-up</MenuItem>
                <MenuItem value="lead">Lead</MenuItem>
                <MenuItem value="support">Suporte</MenuItem>
                <MenuItem value="internal">Interno</MenuItem>
                <MenuItem value="other">Outro</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Prioridade</InputLabel>
              <Select
                value={formData.priority}
                label="Prioridade"
                onChange={handleChange('priority')}
              >
                <MenuItem value="low">Baixa</MenuItem>
                <MenuItem value="medium">Média</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
                <MenuItem value="urgent">Urgente</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={handleChange('status')}
              >
                <MenuItem value="todo">A Fazer</MenuItem>
                <MenuItem value="in_progress">Em Andamento</MenuItem>
                <MenuItem value="blocked">Bloqueado</MenuItem>
                <MenuItem value="done">Concluído</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Data Limite"
              type="date"
              value={formData.due_date}
              onChange={handleChange('due_date')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <Typography variant="subtitle2" sx={{ pt: 1 }}>
            Informações do Cliente (opcional)
          </Typography>

          <TextField
            label="Nome do Cliente"
            value={formData.customer_name}
            onChange={handleChange('customer_name')}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Telefone"
              value={formData.customer_phone}
              onChange={handleChange('customer_phone')}
              fullWidth
            />
            <TextField
              label="Email"
              value={formData.customer_email}
              onChange={handleChange('customer_email')}
              fullWidth
            />
          </Stack>

          {task?.source === 'agent' && (
            <Alert severity="info" icon={<Iconify icon="solar:cpu-bolt-bold" />}>
              Esta tarefa foi criada por um agente de IA
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !formData.title}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
