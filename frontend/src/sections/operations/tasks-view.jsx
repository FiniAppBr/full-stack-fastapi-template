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
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STATUS_CONFIG = {
  todo: { label: 'A Fazer', color: '#00B8D9', bgColor: '#E3FAFC', icon: 'solar:clipboard-list-bold' },
  in_progress: { label: 'Em Andamento', color: '#FFAB00', bgColor: '#FFF7CD', icon: 'solar:refresh-bold' },
  blocked: { label: 'Bloqueado', color: '#FF5630', bgColor: '#FFE7D9', icon: 'solar:danger-bold' },
  done: { label: 'Concluido', color: '#36B37E', bgColor: '#E3FCEF', icon: 'solar:check-circle-bold' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: '#00B8D9', icon: 'solar:double-alt-arrow-down-bold-duotone' },
  medium: { label: 'Media', color: '#FFAB00', icon: 'solar:double-alt-arrow-right-bold-duotone' },
  high: { label: 'Alta', color: '#FF5630', icon: 'solar:double-alt-arrow-up-bold-duotone' },
  urgent: { label: 'Urgente', color: '#DE350B', icon: 'solar:danger-triangle-bold' },
};

const TYPE_CONFIG = {
  follow_up: { label: 'Follow-up', icon: 'solar:phone-calling-bold', color: '#6554C0' },
  lead: { label: 'Lead', icon: 'solar:user-plus-bold', color: '#00875A' },
  support: { label: 'Suporte', icon: 'solar:headphones-round-bold', color: '#0052CC' },
  internal: { label: 'Interno', icon: 'solar:buildings-bold', color: '#172B4D' },
  other: { label: 'Outro', icon: 'solar:document-bold', color: '#5243AA' },
};

// ----------------------------------------------------------------------

// Standalone panel for embedding in Kanban tabs
export function TasksPanel() {
  return <TasksContent />;
}

// Full page view (legacy, can be removed later)
export function TasksView() {
  return <TasksContent />;
}

function TasksContent() {
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

  // Handle status update
  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await axios.patch(endpoints.scheduling.taskDetails(taskId), {
        status: newStatus,
      });
      await fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
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
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1}>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            if (statusFilter === 'pending' && key === 'done') return null;
            const count = groupedTasks[key]?.length || 0;
            return (
              <Box
                key={key}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: alpha(config.color, 0.08),
                  border: `1px solid ${alpha(config.color, 0.16)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Iconify icon={config.icon} width={18} sx={{ color: config.color }} />
                <Typography variant="subtitle2" sx={{ color: config.color }}>
                  {count}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {config.label}
                </Typography>
              </Box>
            );
          })}
        </Stack>

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
              <MenuItem value="done">Concluidos</MenuItem>
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

      {/* Kanban Columns */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: statusFilter === 'pending'
            ? 'repeat(3, 1fr)'
            : 'repeat(4, 1fr)',
        }}
      >
        {['todo', 'in_progress', 'blocked', 'done'].map((status) => {
          const config = STATUS_CONFIG[status];
          const statusTasks = groupedTasks[status];

          // Skip done column if filter is pending
          if (statusFilter === 'pending' && status === 'done') return null;

          return (
            <Box
              key={status}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
                border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
                minHeight: 400,
              }}
            >
              {/* Column Header */}
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: config.color,
                    boxShadow: `0 0 0 3px ${alpha(config.color, 0.24)}`,
                  }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                  {config.label}
                </Typography>
                <Box
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: alpha(config.color, 0.12),
                    color: config.color,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                >
                  {statusTasks.length}
                </Box>
              </Stack>

              {/* Tasks */}
              <Stack spacing={1.5}>
                {statusTasks.length === 0 ? (
                  <Box
                    sx={{
                      py: 4,
                      textAlign: 'center',
                      color: 'text.secondary',
                      border: (theme) => `1px dashed ${theme.palette.divider}`,
                      borderRadius: 2,
                    }}
                  >
                    <Iconify icon="solar:inbox-line-bold-duotone" width={40} sx={{ opacity: 0.5, mb: 1 }} />
                    <Typography variant="body2">Nenhuma tarefa</Typography>
                  </Box>
                ) : (
                  statusTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      statusConfig={config}
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
            </Box>
          );
        })}
      </Box>

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
    </>
  );
}

// ----------------------------------------------------------------------

function TaskCard({ task, statusConfig, onEdit, onStatusChange, onDelete }) {
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const typeConfig = TYPE_CONFIG[task.task_type] || TYPE_CONFIG.other;

  // Due date calculation
  const getDueDateInfo = () => {
    if (!task.due_date) return null;
    const dueDate = parseISO(task.due_date);
    const daysUntil = differenceInDays(dueDate, new Date());

    if (daysUntil < 0) {
      return { label: `Atrasado ${-daysUntil}d`, color: '#FF5630', isOverdue: true };
    }
    if (daysUntil === 0) {
      return { label: 'Hoje', color: '#FFAB00', isOverdue: false };
    }
    if (daysUntil === 1) {
      return { label: 'Amanha', color: '#00B8D9', isOverdue: false };
    }
    return { label: format(dueDate, 'dd/MM'), color: '#637381', isOverdue: false };
  };

  const dueDateInfo = getDueDateInfo();

  return (
    <Card
      sx={{
        cursor: 'pointer',
        border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
        boxShadow: 'none',
        position: 'relative',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.4),
          boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.grey[500], 0.16)}`,
        },
      }}
      onClick={onEdit}
    >
      {/* Priority bar */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: priorityConfig.color,
          borderRadius: '4px 0 0 4px',
        }}
      />

      <CardContent sx={{ p: 2, pl: 2.5, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          {/* Header */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1, lineHeight: 1.4 }}>
              {task.title}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              sx={{
                ml: 0.5,
                mt: -0.5,
                mr: -0.5,
                color: 'text.secondary',
                '&:hover': { color: 'error.main' },
              }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={16} />
            </IconButton>
          </Stack>

          {/* Customer info */}
          {task.customer_name && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Iconify icon="solar:user-bold" width={14} sx={{ color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {task.customer_name}
              </Typography>
            </Stack>
          )}

          {/* Tags row */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {/* Priority */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: alpha(priorityConfig.color, 0.12),
                color: priorityConfig.color,
              }}
            >
              <Iconify icon={priorityConfig.icon} width={14} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {priorityConfig.label}
              </Typography>
            </Box>

            {/* Type */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.24)}`,
              }}
            >
              <Iconify icon={typeConfig.icon} width={14} sx={{ color: typeConfig.color }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {typeConfig.label}
              </Typography>
            </Box>

            {/* Due date */}
            {dueDateInfo && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: alpha(dueDateInfo.color, 0.12),
                  color: dueDateInfo.color,
                }}
              >
                <Iconify icon="solar:calendar-bold" width={14} />
                <Typography variant="caption" sx={{ fontWeight: dueDateInfo.isOverdue ? 600 : 400 }}>
                  {dueDateInfo.label}
                </Typography>
              </Box>
            )}

            {/* Agent badge */}
            {task.source === 'agent' && (
              <Tooltip title="Criada pelo agente IA">
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                    color: 'primary.main',
                  }}
                >
                  <Iconify icon="solar:cpu-bolt-bold" width={14} />
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    IA
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Stack>

          {/* Quick actions */}
          <Stack direction="row" spacing={0.5}>
            {task.status !== 'done' && (
              <Button
                size="small"
                variant="soft"
                color="success"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, 'done');
                }}
                sx={{
                  minWidth: 0,
                  px: 1,
                  py: 0.5,
                  fontSize: '0.75rem',
                }}
              >
                <Iconify icon="solar:check-circle-bold" width={16} sx={{ mr: 0.5 }} />
                Concluir
              </Button>
            )}
            {task.status === 'todo' && (
              <Button
                size="small"
                variant="soft"
                color="info"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, 'in_progress');
                }}
                sx={{
                  minWidth: 0,
                  px: 1,
                  py: 0.5,
                  fontSize: '0.75rem',
                }}
              >
                <Iconify icon="solar:play-bold" width={16} sx={{ mr: 0.5 }} />
                Iniciar
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button
                size="small"
                variant="soft"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, 'blocked');
                }}
                sx={{
                  minWidth: 0,
                  px: 1,
                  py: 0.5,
                  fontSize: '0.75rem',
                }}
              >
                <Iconify icon="solar:pause-bold" width={16} sx={{ mr: 0.5 }} />
                Bloquear
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Iconify icon={isNew ? 'solar:add-circle-bold' : 'solar:pen-bold'} />
        {isNew ? 'Nova Tarefa' : 'Editar Tarefa'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Titulo"
            value={formData.title}
            onChange={handleChange('title')}
            fullWidth
            required
          />

          <TextField
            label="Descricao"
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
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon={config.icon} width={18} sx={{ color: config.color }} />
                      <span>{config.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Prioridade</InputLabel>
              <Select
                value={formData.priority}
                label="Prioridade"
                onChange={handleChange('priority')}
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon={config.icon} width={18} sx={{ color: config.color }} />
                      <span>{config.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
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
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: config.color,
                        }}
                      />
                      <span>{config.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
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

          <Box sx={{ bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="solar:user-bold" width={18} />
              Informacoes do Cliente (opcional)
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="Nome do Cliente"
                value={formData.customer_name}
                onChange={handleChange('customer_name')}
                fullWidth
                size="small"
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Telefone"
                  value={formData.customer_phone}
                  onChange={handleChange('customer_phone')}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Email"
                  value={formData.customer_email}
                  onChange={handleChange('customer_email')}
                  fullWidth
                  size="small"
                />
              </Stack>
            </Stack>
          </Box>

          {task?.source === 'agent' && (
            <Alert
              severity="info"
              icon={<Iconify icon="solar:cpu-bolt-bold" />}
              sx={{ borderRadius: 2 }}
            >
              Esta tarefa foi criada automaticamente pelo agente de IA
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
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
