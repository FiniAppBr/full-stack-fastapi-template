import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, styled } from '@mui/material/styles';

import { useTabs } from 'src/hooks/use-tabs';
import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomTabs } from 'src/components/custom-tabs';
import { useDateRangePicker, CustomDateRangePicker } from 'src/components/custom-date-range-picker';

import { KanbanDetailsToolbar } from './kanban-details-toolbar';
import { KanbanInputName } from '../components/kanban-input-name';
import { KanbanDetailsAttachments } from './kanban-details-attachments';
import { KanbanDetailsCommentList } from './kanban-details-comment-list';
import { KanbanDetailsCommentInput } from './kanban-details-comment-input';

// ----------------------------------------------------------------------

// Label colors (same as item-base)
const LABEL_COLORS = [
  '#00B8D9', '#36B37E', '#6554C0', '#FF5630', '#FFAB00',
  '#00875A', '#5243AA', '#FF8B00', '#0052CC', '#172B4D'
];

const getLabelColor = (label) => {
  const hash = label.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return LABEL_COLORS[hash % LABEL_COLORS.length];
};

const StyledLabel = styled('span')(({ theme }) => ({
  ...theme.typography.caption,
  width: 100,
  flexShrink: 0,
  color: theme.vars.palette.text.secondary,
  fontWeight: theme.typography.fontWeightSemiBold,
}));

const InfoRow = styled(Stack)(({ theme }) => ({
  padding: theme.spacing(1.5, 0),
  borderBottom: `1px dashed ${alpha(theme.palette.grey[500], 0.16)}`,
}));

// ----------------------------------------------------------------------

export function KanbanDetails({ task, openDetails, onUpdateTask, onDeleteTask, onCloseDetails }) {
  const tabs = useTabs('detalhes');

  const [priority, setPriority] = useState(task.priority);
  const [taskName, setTaskName] = useState(task.name);
  const [taskDescription, setTaskDescription] = useState(task.description || '');
  const [labels, setLabels] = useState(task.labels || []);
  const [newLabel, setNewLabel] = useState('');

  const like = useBoolean();
  const showLabelInput = useBoolean();

  // Handle null or single-element due dates
  const dueStart = task.due?.[0] ? dayjs(task.due[0]) : null;
  const dueEnd = task.due?.[1] ? dayjs(task.due[1]) : dueStart;
  const rangePicker = useDateRangePicker(dueStart, dueEnd);

  const handleChangeTaskName = useCallback((event) => {
    setTaskName(event.target.value);
  }, []);

  const handleUpdateTask = useCallback(
    (event) => {
      if (event.key === 'Enter' && taskName) {
        onUpdateTask({ ...task, name: taskName });
      }
    },
    [onUpdateTask, task, taskName]
  );

  const handleChangeTaskDescription = useCallback((event) => {
    setTaskDescription(event.target.value);
  }, []);

  const handleSaveDescription = useCallback(() => {
    if (taskDescription !== task.description) {
      onUpdateTask({ ...task, description: taskDescription });
    }
  }, [onUpdateTask, task, taskDescription]);

  const handleChangePriority = useCallback((newValue) => {
    setPriority(newValue);
    onUpdateTask({ ...task, priority: newValue });
  }, [onUpdateTask, task]);

  const handleAddLabel = useCallback(() => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      const updatedLabels = [...labels, newLabel.trim()];
      setLabels(updatedLabels);
      onUpdateTask({ ...task, labels: updatedLabels });
      setNewLabel('');
      showLabelInput.onFalse();
    }
  }, [newLabel, labels, onUpdateTask, task, showLabelInput]);

  const handleRemoveLabel = useCallback((labelToRemove) => {
    const updatedLabels = labels.filter((l) => l !== labelToRemove);
    setLabels(updatedLabels);
    onUpdateTask({ ...task, labels: updatedLabels });
  }, [labels, onUpdateTask, task]);

  const renderToolbar = (
    <KanbanDetailsToolbar
      liked={like.value}
      taskName={task.name}
      priority={priority}
      onLike={like.onToggle}
      onDelete={onDeleteTask}
      onCloseDetails={onCloseDetails}
      onChangePriority={handleChangePriority}
    />
  );

  const renderTabs = (
    <CustomTabs
      value={tabs.value}
      onChange={tabs.onChange}
      variant="fullWidth"
      slotProps={{ tab: { px: 0 } }}
    >
      {[
        { value: 'detalhes', label: 'Detalhes' },
        { value: 'atividade', label: 'Atividade' },
        { value: 'notas', label: `Notas (${task.comments?.length || 0})` },
      ].map((tab) => (
        <Tab key={tab.value} value={tab.value} label={tab.label} />
      ))}
    </CustomTabs>
  );

  const renderTabDetails = (
    <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
      {/* Contact Name (editable) */}
      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          Nome do Lead
        </Typography>
        <KanbanInputName
          placeholder="Nome do contato"
          value={taskName}
          onChange={handleChangeTaskName}
          onKeyUp={handleUpdateTask}
          inputProps={{ id: `input-task-${taskName}` }}
        />
      </Box>

      {/* Contact Info Section */}
      <Box sx={{ bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04), borderRadius: 2, p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify icon="solar:user-bold" width={18} />
          Informacoes de Contato
        </Typography>

        {task.contact_phone && (
          <InfoRow direction="row" alignItems="center" spacing={2}>
            <Iconify icon="solar:phone-bold" width={20} sx={{ color: 'primary.main' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Telefone
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {task.contact_phone}
              </Typography>
            </Box>
            <Tooltip title="Ligar">
              <IconButton size="small" href={`tel:${task.contact_phone}`}>
                <Iconify icon="solar:outgoing-call-bold" width={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="WhatsApp">
              <IconButton
                size="small"
                href={`https://wa.me/${task.contact_phone?.replace(/\D/g, '')}`}
                target="_blank"
                sx={{ color: '#25D366' }}
              >
                <Iconify icon="logos:whatsapp-icon" width={18} />
              </IconButton>
            </Tooltip>
          </InfoRow>
        )}

        {task.contact_email && (
          <InfoRow direction="row" alignItems="center" spacing={2}>
            <Iconify icon="solar:letter-bold" width={20} sx={{ color: 'info.main' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                E-mail
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                {task.contact_email}
              </Typography>
            </Box>
            <Tooltip title="Enviar e-mail">
              <IconButton size="small" href={`mailto:${task.contact_email}`}>
                <Iconify icon="solar:plain-bold" width={18} />
              </IconButton>
            </Tooltip>
          </InfoRow>
        )}

        {!task.contact_phone && !task.contact_email && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            Nenhuma informacao de contato disponivel
          </Typography>
        )}
      </Box>

      {/* Labels Section */}
      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          Etiquetas
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
          {labels.map((label) => (
            <Chip
              key={label}
              label={label}
              size="small"
              onDelete={() => handleRemoveLabel(label)}
              sx={{
                bgcolor: alpha(getLabelColor(label), 0.12),
                color: getLabelColor(label),
                border: `1px solid ${alpha(getLabelColor(label), 0.24)}`,
                '& .MuiChip-deleteIcon': {
                  color: getLabelColor(label),
                  '&:hover': { color: 'error.main' },
                },
              }}
            />
          ))}

          {showLabelInput.value ? (
            <TextField
              size="small"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddLabel();
                if (e.key === 'Escape') {
                  setNewLabel('');
                  showLabelInput.onFalse();
                }
              }}
              onBlur={() => {
                if (!newLabel.trim()) showLabelInput.onFalse();
              }}
              autoFocus
              placeholder="Nova etiqueta..."
              sx={{ width: 120 }}
              InputProps={{ sx: { height: 32, fontSize: '0.875rem' } }}
            />
          ) : (
            <Tooltip title="Adicionar etiqueta">
              <IconButton
                size="small"
                onClick={showLabelInput.onTrue}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                  border: (theme) => `dashed 1px ${theme.palette.divider}`,
                }}
              >
                <Iconify icon="mingcute:add-line" width={16} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Due Date */}
      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          Data de Vencimento
        </Typography>
        {rangePicker.selected ? (
          <Button
            variant="outlined"
            size="small"
            onClick={rangePicker.onOpen}
            startIcon={<Iconify icon="solar:calendar-bold" />}
            sx={{
              color: dayjs(task.due?.[0]).isBefore(dayjs()) ? 'error.main' : 'text.primary',
              borderColor: dayjs(task.due?.[0]).isBefore(dayjs()) ? 'error.main' : 'divider',
            }}
          >
            {rangePicker.shortLabel}
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="small"
            onClick={rangePicker.onOpen}
            startIcon={<Iconify icon="mingcute:add-line" />}
            sx={{ borderStyle: 'dashed' }}
          >
            Definir data
          </Button>
        )}

        <CustomDateRangePicker
          variant="calendar"
          title="Selecione a data"
          startDate={rangePicker.startDate}
          endDate={rangePicker.endDate}
          onChangeStartDate={rangePicker.onChangeStartDate}
          onChangeEndDate={rangePicker.onChangeEndDate}
          open={rangePicker.open}
          onClose={rangePicker.onClose}
          selected={rangePicker.selected}
          error={rangePicker.error}
        />
      </Box>

      {/* Description */}
      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          Descricao / Observacoes
        </Typography>
        <TextField
          fullWidth
          multiline
          size="small"
          minRows={3}
          placeholder="Adicione notas sobre este lead..."
          value={taskDescription}
          onChange={handleChangeTaskDescription}
          onBlur={handleSaveDescription}
          InputProps={{ sx: { typography: 'body2' } }}
        />
      </Box>

      {/* Attachments */}
      {!!task.attachments?.length && (
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            Anexos
          </Typography>
          <KanbanDetailsAttachments attachments={task.attachments} />
        </Box>
      )}
    </Box>
  );

  const renderTabActivity = (
    <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
        <Iconify icon="solar:clock-circle-bold-duotone" width={48} sx={{ mb: 2, opacity: 0.5 }} />
        <br />
        Historico de atividades em breve...
      </Typography>
    </Box>
  );

  const renderTabComments = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {task.comments?.length ? (
        <KanbanDetailsCommentList comments={task.comments} />
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          Nenhuma nota ainda
        </Typography>
      )}
    </Box>
  );

  return (
    <Drawer
      open={openDetails}
      onClose={onCloseDetails}
      anchor="right"
      slotProps={{ backdrop: { invisible: true } }}
      PaperProps={{ sx: { width: { xs: 1, sm: 480 } } }}
    >
      {renderToolbar}

      {renderTabs}

      <Scrollbar fillContent sx={{ py: 3, px: 2.5 }}>
        {tabs.value === 'detalhes' && renderTabDetails}
        {tabs.value === 'atividade' && renderTabActivity}
        {tabs.value === 'notas' && renderTabComments}
      </Scrollbar>

      {tabs.value === 'notas' && <KanbanDetailsCommentInput />}
    </Drawer>
  );
}
