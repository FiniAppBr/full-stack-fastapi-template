import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const DAYS_OF_WEEK = [
  { value: 0, label: 'Segunda', short: 'Seg' },
  { value: 1, label: 'Terça', short: 'Ter' },
  { value: 2, label: 'Quarta', short: 'Qua' },
  { value: 3, label: 'Quinta', short: 'Qui' },
  { value: 4, label: 'Sexta', short: 'Sex' },
  { value: 5, label: 'Sábado', short: 'Sáb' },
  { value: 6, label: 'Domingo', short: 'Dom' },
];

const TIME_OPTIONS = [];
for (let h = 6; h <= 22; h += 1) {
  for (let m = 0; m < 60; m += 30) {
    const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    TIME_OPTIONS.push(time);
  }
}

const SLOT_DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
];

// ----------------------------------------------------------------------

export function ProfessionalsTab() {
  const theme = useTheme();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [saving, setSaving] = useState(false);

  // New schedule form
  const [newScheduleDay, setNewScheduleDay] = useState(0);
  const [newScheduleStart, setNewScheduleStart] = useState('09:00');
  const [newScheduleEnd, setNewScheduleEnd] = useState('18:00');
  const [newSlotDuration, setNewSlotDuration] = useState(60);
  const [newBreakDuration, setNewBreakDuration] = useState(0);

  // Exception (day off) form
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionNote, setExceptionNote] = useState('');

  const fetchProfessionals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(endpoints.operations.professionals);
      setProfessionals(response.data || []);
    } catch (err) {
      console.error('Failed to fetch professionals:', err);
      setError('Erro ao carregar profissionais');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfessionals();
  }, [fetchProfessionals]);

  const fetchSchedules = useCallback(async (entityId) => {
    try {
      const response = await axios.get(endpoints.scheduling.schedules, {
        params: { entity_id: entityId },
      });
      const schedulesData = response.data?.data || response.data || [];
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
      setSchedules([]);
    }
  }, []);

  const handleRowClick = async (professional) => {
    setSelectedProfessional(professional);
    setDialogOpen(true);
    await fetchSchedules(professional.entity.id);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProfessional(null);
    setSchedules([]);
  };

  // Split schedules into recurring and exceptions
  const { recurringSchedules, exceptionSchedules } = useMemo(() => {
    const recurring = schedules.filter((s) => s.specific_date === null);
    const exceptions = schedules.filter((s) => s.specific_date !== null);
    return { recurringSchedules: recurring, exceptionSchedules: exceptions };
  }, [schedules]);

  const handleAddSchedule = async () => {
    if (!selectedProfessional) return;

    try {
      setSaving(true);
      await axios.post(endpoints.scheduling.schedules, {
        entity_id: selectedProfessional.entity.id,
        day_of_week: newScheduleDay,
        start_time: newScheduleStart,
        end_time: newScheduleEnd,
        slot_duration_minutes: newSlotDuration,
        break_between_minutes: newBreakDuration,
        is_available: true,
      });
      await fetchSchedules(selectedProfessional.entity.id);
    } catch (err) {
      console.error('Failed to add schedule:', err);
      alert('Erro ao adicionar horário');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      setSaving(true);
      await axios.delete(endpoints.scheduling.scheduleDetails(scheduleId));
      await fetchSchedules(selectedProfessional.entity.id);
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      alert('Erro ao remover horário');
    } finally {
      setSaving(false);
    }
  };

  const handleAddException = async (isAvailable) => {
    if (!selectedProfessional || !exceptionDate) return;

    try {
      setSaving(true);
      await axios.post(endpoints.scheduling.schedules, {
        entity_id: selectedProfessional.entity.id,
        specific_date: exceptionDate,
        start_time: isAvailable ? newScheduleStart : '00:00',
        end_time: isAvailable ? newScheduleEnd : '00:00',
        is_available: isAvailable,
        notes: exceptionNote || (isAvailable ? 'Horário especial' : 'Folga'),
      });
      setExceptionDate('');
      setExceptionNote('');
      await fetchSchedules(selectedProfessional.entity.id);
    } catch (err) {
      console.error('Failed to add exception:', err);
      alert('Erro ao adicionar exceção');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (professionals.length === 0) {
    return (
      <Stack alignItems="center" spacing={2} py={6}>
        <Iconify icon="solar:users-group-rounded-bold" width={64} sx={{ color: 'text.disabled' }} />
        <Typography variant="h6" color="text.secondary">
          Nenhum profissional encontrado
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
          Adicione a capacidade &quot;schedulable&quot; a uma entidade em{' '}
          <strong>AI & Intelligence &gt; Entidades</strong> para gerenciar seus horários.
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Profissional</TableCell>
              <TableCell>Serviços</TableCell>
              <TableCell>Horários Cadastrados</TableCell>
              <TableCell width={60} />
            </TableRow>
          </TableHead>
          <TableBody>
            {professionals.map((professional) => (
              <TableRow
                key={professional.entity.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => handleRowClick(professional)}
              >
                <TableCell>
                  <Typography variant="subtitle2">{professional.entity.name}</Typography>
                  {professional.entity.data?.role && (
                    <Typography variant="caption" color="text.secondary">
                      {professional.entity.data.role}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {professional.services.length > 0 ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {professional.services.slice(0, 2).map((service) => (
                        <Chip
                          key={service.id}
                          label={service.name}
                          size="small"
                          variant="soft"
                          color="primary"
                        />
                      ))}
                      {professional.services.length > 2 && (
                        <Chip
                          label={`+${professional.services.length - 2}`}
                          size="small"
                          variant="soft"
                        />
                      )}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      Nenhum serviço
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label="Configurar"
                    size="small"
                    variant="outlined"
                    icon={<Iconify icon="solar:calendar-bold" width={16} />}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small">
                    <Iconify icon="solar:calendar-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {selectedProfessional && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:calendar-bold" />
                <span>Horários - {selectedProfessional.entity.name}</span>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                {/* Left column - Recurring schedules */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Horários Regulares
                  </Typography>

                  {recurringSchedules.length > 0 ? (
                    <List dense>
                      {recurringSchedules
                        .sort((a, b) => a.day_of_week - b.day_of_week)
                        .map((schedule) => (
                          <ListItem
                            key={schedule.id}
                            sx={{
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                              borderRadius: 1,
                              mb: 0.5,
                            }}
                          >
                            <ListItemText
                              primary={DAYS_OF_WEEK[schedule.day_of_week]?.label}
                              secondary={`${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)} | ${schedule.slot_duration_minutes}min/sessão`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                disabled={saving}
                              >
                                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Nenhum horário regular cadastrado
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Adicionar Horário
                  </Typography>

                  <Stack spacing={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Dia da Semana</InputLabel>
                      <Select
                        value={newScheduleDay}
                        label="Dia da Semana"
                        onChange={(e) => setNewScheduleDay(e.target.value)}
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <MenuItem key={day.value} value={day.value}>
                            {day.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Stack direction="row" spacing={1}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Início</InputLabel>
                        <Select
                          value={newScheduleStart}
                          label="Início"
                          onChange={(e) => setNewScheduleStart(e.target.value)}
                        >
                          {TIME_OPTIONS.map((time) => (
                            <MenuItem key={time} value={time}>
                              {time}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Fim</InputLabel>
                        <Select
                          value={newScheduleEnd}
                          label="Fim"
                          onChange={(e) => setNewScheduleEnd(e.target.value)}
                        >
                          {TIME_OPTIONS.map((time) => (
                            <MenuItem key={time} value={time}>
                              {time}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Duração da Sessão</InputLabel>
                        <Select
                          value={newSlotDuration}
                          label="Duração da Sessão"
                          onChange={(e) => setNewSlotDuration(e.target.value)}
                        >
                          {SLOT_DURATION_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Intervalo</InputLabel>
                        <Select
                          value={newBreakDuration}
                          label="Intervalo"
                          onChange={(e) => setNewBreakDuration(e.target.value)}
                        >
                          <MenuItem value={0}>Sem intervalo</MenuItem>
                          <MenuItem value={5}>5 min</MenuItem>
                          <MenuItem value={10}>10 min</MenuItem>
                          <MenuItem value={15}>15 min</MenuItem>
                          <MenuItem value={30}>30 min</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>

                    <Button
                      variant="contained"
                      onClick={handleAddSchedule}
                      disabled={saving}
                      startIcon={<Iconify icon="mingcute:add-line" />}
                    >
                      Adicionar
                    </Button>
                  </Stack>
                </Grid>

                {/* Right column - Exceptions */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Exceções (Folgas e Horários Especiais)
                  </Typography>

                  {exceptionSchedules.length > 0 ? (
                    <List dense>
                      {exceptionSchedules
                        .sort((a, b) => new Date(a.specific_date) - new Date(b.specific_date))
                        .map((schedule) => (
                          <ListItem
                            key={schedule.id}
                            sx={{
                              bgcolor: schedule.is_available
                                ? alpha(theme.palette.info.main, 0.08)
                                : alpha(theme.palette.error.main, 0.08),
                              borderRadius: 1,
                              mb: 0.5,
                            }}
                          >
                            <ListItemText
                              primary={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <span>
                                    {format(parseISO(schedule.specific_date), "dd/MM/yyyy (EEEE)", {
                                      locale: ptBR,
                                    })}
                                  </span>
                                  <Chip
                                    label={schedule.is_available ? 'Especial' : 'Folga'}
                                    size="small"
                                    color={schedule.is_available ? 'info' : 'error'}
                                    variant="soft"
                                  />
                                </Stack>
                              }
                              secondary={
                                schedule.is_available
                                  ? `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`
                                  : schedule.notes || 'Dia de folga'
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                disabled={saving}
                              >
                                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Nenhuma exceção cadastrada
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Adicionar Exceção
                  </Typography>

                  <Stack spacing={2}>
                    <TextField
                      type="date"
                      label="Data"
                      value={exceptionDate}
                      onChange={(e) => setExceptionDate(e.target.value)}
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                      label="Motivo (opcional)"
                      value={exceptionNote}
                      onChange={(e) => setExceptionNote(e.target.value)}
                      size="small"
                      fullWidth
                      placeholder="Ex: Feriado, Consulta médica..."
                    />

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleAddException(false)}
                        disabled={saving || !exceptionDate}
                        startIcon={<Iconify icon="solar:close-circle-bold" />}
                        fullWidth
                      >
                        Folga
                      </Button>
                      <Button
                        variant="outlined"
                        color="info"
                        onClick={() => handleAddException(true)}
                        disabled={saving || !exceptionDate}
                        startIcon={<Iconify icon="solar:clock-circle-bold" />}
                        fullWidth
                      >
                        Horário Especial
                      </Button>
                    </Stack>
                  </Stack>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Fechar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
