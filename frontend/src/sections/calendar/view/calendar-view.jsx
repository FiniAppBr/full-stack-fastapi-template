import Calendar from '@fullcalendar/react';

import { useState, useEffect, useCallback } from 'react';
import listPlugin from '@fullcalendar/list';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import timelinePlugin from '@fullcalendar/timeline';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Popover from '@mui/material/Popover';
import Fab from '@mui/material/Fab';

import { useBoolean } from 'src/hooks/use-boolean';
import { useSetState } from 'src/hooks/use-set-state';

import { fDate, fTime, fIsAfter, fIsBetween } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { updateEvent, useGetEvents } from 'src/actions/calendar';

import { Iconify } from 'src/components/iconify';

import { StyledCalendar } from '../styles';
import { useEvent } from '../hooks/use-event';
import { CalendarForm } from '../calendar-form';
import { useCalendar } from '../hooks/use-calendar';
import { CalendarToolbar } from '../calendar-toolbar';
import { CalendarFilters } from '../calendar-filters';
import { CalendarFiltersResult } from '../calendar-filters-result';
import { useCalendarNowIndicator } from '../calendar-now-indicator';

// ----------------------------------------------------------------------

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'warning', icon: 'solar:clock-circle-bold' },
  confirmed: { label: 'Confirmado', color: 'info', icon: 'solar:check-circle-bold' },
  completed: { label: 'Concluído', color: 'success', icon: 'solar:check-circle-bold' },
  cancelled: { label: 'Cancelado', color: 'default', icon: 'solar:close-circle-bold' },
  no_show: { label: 'Não compareceu', color: 'error', icon: 'solar:danger-bold' },
};

const STATUS_COLORS = {
  pending: '#FF9800',
  confirmed: '#2196F3',
  completed: '#4CAF50',
  cancelled: '#9E9E9E',
  no_show: '#F44336',
};

// ----------------------------------------------------------------------

export function CalendarView() {
  const theme = useTheme();

  const openFilters = useBoolean();

  const { events, eventsLoading } = useGetEvents();

  const filters = useSetState({
    colors: [],
    startDate: null,
    endDate: null,
  });

  const dateError = fIsAfter(filters.state.startDate, filters.state.endDate);

  // Event preview popover
  const [previewAnchor, setPreviewAnchor] = useState(null);
  const [previewEvent, setPreviewEvent] = useState(null);

  const {
    calendarRef,
    view,
    date,
    onDatePrev,
    onDateNext,
    onDateToday,
    onDropEvent,
    onChangeView,
    onSelectRange,
    onClickEvent,
    onResizeEvent,
    onInitialView,
    openForm,
    onOpenForm,
    onCloseForm,
    selectEventId,
    selectedRange,
    onClickEventInFilters,
  } = useCalendar();

  const currentEvent = useEvent(events, selectEventId, selectedRange, openForm);

  // Custom full-width now indicator
  const { updateIndicator } = useCalendarNowIndicator(calendarRef);

  useEffect(() => {
    onInitialView();
  }, [onInitialView]);

  // Update indicator when view changes
  useEffect(() => {
    // Small delay to ensure DOM is ready after view change
    const timer = setTimeout(updateIndicator, 100);
    return () => clearTimeout(timer);
  }, [view, updateIndicator]);

  const canReset =
    filters.state.colors.length > 0 || (!!filters.state.startDate && !!filters.state.endDate);

  const dataFiltered = applyFilter({ inputData: events, filters: filters.state, dateError });

  // Get today's events for sidebar
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = events
    .filter((event) => {
      const eventDate = new Date(event.start);
      return eventDate >= today && eventDate < tomorrow;
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  // Custom event click handler with preview
  const handleEventClick = useCallback((clickInfo) => {
    clickInfo.jsEvent.preventDefault();
    setPreviewEvent(clickInfo.event);
    setPreviewAnchor(clickInfo.el);
  }, []);

  const handleClosePreview = () => {
    setPreviewAnchor(null);
    setPreviewEvent(null);
  };

  const handleEditFromPreview = () => {
    if (previewEvent) {
      onClickEvent({ event: previewEvent });
    }
    handleClosePreview();
  };

  // Custom event content renderer
  const renderEventContent = (eventInfo) => {
    const { event } = eventInfo;
    const status = event.extendedProps?.status || 'pending';
    const customerName = event.extendedProps?.customer_name || event.title;
    const serviceName = event.extendedProps?.service_name;
    const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending;

    // For month view, show compact
    if (eventInfo.view.type === 'dayGridMonth') {
      return (
        <Box
          sx={{
            px: 0.75,
            py: 0.25,
            borderRadius: 0.75,
            bgcolor: `${statusColor}20`,
            borderLeft: `3px solid ${statusColor}`,
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: statusColor,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fTime(event.start)} {customerName}
          </Typography>
        </Box>
      );
    }

    // For week/day view, show more detail
    return (
      <Box
        sx={{
          p: 0.75,
          height: '100%',
          borderRadius: 1,
          bgcolor: `${statusColor}15`,
          borderLeft: `3px solid ${statusColor}`,
          overflow: 'hidden',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: statusColor,
            display: 'block',
            lineHeight: 1.2,
          }}
        >
          {customerName}
        </Typography>
        {serviceName && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              fontSize: '0.65rem',
              mt: 0.25,
            }}
          >
            {serviceName}
          </Typography>
        )}
      </Box>
    );
  };

  const renderResults = (
    <CalendarFiltersResult
      filters={filters}
      totalResults={dataFiltered.length}
      sx={{ mb: { xs: 3, md: 5 } }}
    />
  );

  const flexProps = { flex: '1 1 auto', display: 'flex', flexDirection: 'column' };

  return (
    <>
      <DashboardContent maxWidth="xl" sx={{ ...flexProps }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Agenda</Typography>

        {canReset && renderResults}

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} sx={{ ...flexProps }}>
          {/* Sidebar - Today's Agenda */}
          <Card
            sx={{
              width: { xs: '100%', lg: 320 },
              flexShrink: 0,
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">Hoje</Typography>
              <Chip
                label={todayEvents.length}
                size="small"
                color="primary"
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
              {fDate(new Date(), 'EEEE, dd MMMM')}
            </Typography>

            <Divider sx={{ mb: 2 }} />

            {todayEvents.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Iconify
                  icon="solar:calendar-minimalistic-bold-duotone"
                  width={48}
                  sx={{ color: 'text.disabled', mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Nenhum agendamento hoje
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5} sx={{ flex: 1, overflow: 'auto' }}>
                {todayEvents.map((event) => {
                  const status = event.extendedProps?.status || 'pending';
                  const statusConfig = STATUS_CONFIG[status];
                  const statusColor = STATUS_COLORS[status];

                  return (
                    <Box
                      key={event.id}
                      onClick={() => onClickEventInFilters(event.id)}
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        '&:hover': {
                          borderColor: statusColor,
                          bgcolor: `${statusColor}08`,
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 4,
                            height: '100%',
                            minHeight: 40,
                            borderRadius: 1,
                            bgcolor: statusColor,
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: statusColor }}>
                              {fTime(event.start)}
                            </Typography>
                            {event.end && (
                              <>
                                <Typography variant="caption" color="text.disabled">-</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {fTime(event.end)}
                                </Typography>
                              </>
                            )}
                          </Stack>
                          <Typography variant="subtitle2" noWrap>
                            {event.extendedProps?.customer_name || event.title}
                          </Typography>
                          {event.extendedProps?.service_name && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {event.extendedProps.service_name}
                            </Typography>
                          )}
                          <Chip
                            size="small"
                            label={statusConfig?.label || status}
                            sx={{
                              mt: 0.5,
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: `${statusColor}20`,
                              color: statusColor,
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}

            {/* Quick Stats */}
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1,
              }}
            >
              {[
                { status: 'pending', count: todayEvents.filter(e => e.extendedProps?.status === 'pending').length },
                { status: 'confirmed', count: todayEvents.filter(e => e.extendedProps?.status === 'confirmed').length },
              ].map(({ status, count }) => (
                <Box
                  key={status}
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    textAlign: 'center',
                    bgcolor: `${STATUS_COLORS[status]}10`,
                  }}
                >
                  <Typography variant="h6" sx={{ color: STATUS_COLORS[status] }}>
                    {count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {STATUS_CONFIG[status].label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Card>

          {/* Main Calendar */}
          <Card sx={{ ...flexProps, minHeight: '60vh', flex: 1 }}>
            <StyledCalendar sx={{ ...flexProps, '.fc.fc-media-screen': { flex: '1 1 auto' } }}>
              <CalendarToolbar
                date={fDate(date)}
                view={view}
                canReset={canReset}
                loading={eventsLoading}
                onNextDate={onDateNext}
                onPrevDate={onDatePrev}
                onToday={onDateToday}
                onChangeView={onChangeView}
                onOpenFilters={openFilters.onTrue}
              />

              <Calendar
                weekends
                editable
                droppable
                selectable
                rerenderDelay={10}
                allDayMaintainDuration
                eventResizableFromStart
                ref={calendarRef}
                initialDate={date}
                initialView={view}
                dayMaxEventRows={3}
                eventDisplay="block"
                events={dataFiltered}
                headerToolbar={false}
                select={onSelectRange}
                eventClick={handleEventClick}
                eventContent={renderEventContent}
                aspectRatio={3}
                locale={ptBrLocale}
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                slotDuration="00:30:00"
                businessHours={{
                  daysOfWeek: [1, 2, 3, 4, 5, 6],
                  startTime: '08:00',
                  endTime: '20:00',
                }}
                eventDrop={(arg) => {
                  onDropEvent(arg, updateEvent);
                }}
                eventResize={(arg) => {
                  onResizeEvent(arg, updateEvent);
                }}
                plugins={[
                  listPlugin,
                  dayGridPlugin,
                  timelinePlugin,
                  timeGridPlugin,
                  interactionPlugin,
                ]}
              />
            </StyledCalendar>
          </Card>
        </Stack>
      </DashboardContent>

      {/* Event Preview Popover */}
      <Popover
        open={Boolean(previewAnchor)}
        anchorEl={previewAnchor}
        onClose={handleClosePreview}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: { width: 280, p: 0 },
          },
        }}
      >
        {previewEvent && (
          <Box>
            <Box
              sx={{
                p: 2,
                bgcolor: `${STATUS_COLORS[previewEvent.extendedProps?.status || 'pending']}15`,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1">
                  {previewEvent.extendedProps?.customer_name || previewEvent.title}
                </Typography>
                <IconButton size="small" onClick={handleClosePreview}>
                  <Iconify icon="eva:close-fill" width={18} />
                </IconButton>
              </Stack>
              {previewEvent.extendedProps?.service_name && (
                <Typography variant="body2" color="text.secondary">
                  {previewEvent.extendedProps.service_name}
                </Typography>
              )}
            </Box>

            <Box sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:clock-circle-bold" width={18} sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {fTime(previewEvent.start)}
                    {previewEvent.end && ` - ${fTime(previewEvent.end)}`}
                  </Typography>
                </Stack>

                {previewEvent.extendedProps?.customer_phone && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon="solar:phone-bold" width={18} sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {previewEvent.extendedProps.customer_phone}
                    </Typography>
                  </Stack>
                )}

                <Chip
                  size="small"
                  label={STATUS_CONFIG[previewEvent.extendedProps?.status || 'pending']?.label}
                  sx={{
                    alignSelf: 'flex-start',
                    bgcolor: `${STATUS_COLORS[previewEvent.extendedProps?.status || 'pending']}20`,
                    color: STATUS_COLORS[previewEvent.extendedProps?.status || 'pending'],
                    fontWeight: 600,
                  }}
                />
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  onClick={handleEditFromPreview}
                >
                  Ver detalhes
                </Button>
              </Stack>
            </Box>
          </Box>
        )}
      </Popover>

      {/* Edit Dialog */}
      <Dialog
        fullWidth
        maxWidth="xs"
        open={openForm}
        onClose={onCloseForm}
        transitionDuration={{
          enter: theme.transitions.duration.shortest,
          exit: theme.transitions.duration.shortest - 80,
        }}
        PaperProps={{
          sx: {
            display: 'flex',
            overflow: 'hidden',
            flexDirection: 'column',
            '& form': { minHeight: 0, display: 'flex', flex: '1 1 auto', flexDirection: 'column' },
          },
        }}
      >
        <DialogTitle sx={{ minHeight: 76 }}>
          {openForm && <> {currentEvent?.id ? 'Editar' : 'Novo'} Agendamento</>}
        </DialogTitle>

        <CalendarForm
          currentEvent={currentEvent}
          onClose={onCloseForm}
        />
      </Dialog>

      <CalendarFilters
        events={events}
        filters={filters}
        canReset={canReset}
        dateError={dateError}
        open={openFilters.value}
        onClose={openFilters.onFalse}
        onClickEvent={onClickEventInFilters}
      />

      {/* Floating Action Button */}
      <Fab
        color="primary"
        onClick={onOpenForm}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 999,
        }}
      >
        <Iconify icon="mingcute:add-line" width={24} />
      </Fab>
    </>
  );
}

function applyFilter({ inputData, filters, dateError }) {
  const { colors, startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  inputData = stabilizedThis.map((el) => el[0]);

  if (colors.length) {
    inputData = inputData.filter((event) => colors.includes(event.color));
  }

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((event) => fIsBetween(event.start, startDate, endDate));
    }
  }

  return inputData;
}
