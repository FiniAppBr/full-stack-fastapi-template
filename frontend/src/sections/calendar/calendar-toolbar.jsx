import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const VIEW_OPTIONS = [
  { value: 'dayGridMonth', label: 'Mês', icon: 'mingcute:calendar-month-line' },
  { value: 'timeGridWeek', label: 'Semana', icon: 'mingcute:calendar-week-line' },
  { value: 'timeGridDay', label: 'Dia', icon: 'mingcute:calendar-day-line' },
  { value: 'listWeek', label: 'Lista', icon: 'fluent:calendar-agenda-24-regular' },
];

// ----------------------------------------------------------------------

export function CalendarToolbar({
  date,
  view,
  loading,
  onToday,
  canReset,
  onNextDate,
  onPrevDate,
  onChangeView,
  onOpenFilters,
}) {
  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 2, position: 'relative' }}
      >
        {/* View Toggle */}
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(e, newView) => {
            if (newView !== null) {
              onChangeView(newView);
            }
          }}
          sx={{
            display: { xs: 'none', sm: 'flex' },
            '& .MuiToggleButton-root': {
              px: 1.5,
              py: 0.5,
              border: '1px solid',
              borderColor: 'divider',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              },
            },
          }}
        >
          {VIEW_OPTIONS.map((option) => (
            <ToggleButton key={option.value} value={option.value}>
              <Tooltip title={option.label}>
                <Iconify icon={option.icon} width={20} />
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Date Navigation */}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton onClick={onPrevDate} size="small">
            <Iconify icon="eva:arrow-ios-back-fill" />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              minWidth: 180,
              textAlign: 'center',
              textTransform: 'capitalize',
            }}
          >
            {date}
          </Typography>

          <IconButton onClick={onNextDate} size="small">
            <Iconify icon="eva:arrow-ios-forward-fill" />
          </IconButton>
        </Stack>

        {/* Actions */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button
            size="small"
            variant="soft"
            color="inherit"
            onClick={onToday}
            sx={{ fontWeight: 600 }}
          >
            Hoje
          </Button>

          <IconButton onClick={onOpenFilters} size="small">
            <Badge color="error" variant="dot" invisible={!canReset}>
              <Iconify icon="solar:filter-bold" />
            </Badge>
          </IconButton>
        </Stack>

        {loading && (
          <LinearProgress
            color="primary"
            sx={{
              left: 0,
              width: 1,
              height: 2,
              bottom: 0,
              borderRadius: 0,
              position: 'absolute',
            }}
          />
        )}
      </Stack>
    </>
  );
}
