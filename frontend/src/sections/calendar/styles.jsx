import { styled } from '@mui/material/styles';

import { varAlpha } from 'src/theme/styles';

// ----------------------------------------------------------------------

export const StyledCalendar = styled('div')(({ theme }) => ({
  width: 'calc(100% + 2px)',
  marginLeft: -1,
  marginBottom: -1,

  '& .fc': {
    '--fc-border-color': varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
    '--fc-now-indicator-color': theme.vars.palette.error.main,
    '--fc-today-bg-color': varAlpha(theme.vars.palette.primary['mainChannel'], 0.04),
    '--fc-page-bg-color': theme.vars.palette.background.default,
    '--fc-neutral-bg-color': theme.vars.palette.background.neutral,
    '--fc-list-event-hover-bg-color': theme.vars.palette.action.hover,
    '--fc-highlight-color': varAlpha(theme.vars.palette.primary['mainChannel'], 0.08),
    '--fc-non-business-color': varAlpha(theme.vars.palette.grey['500Channel'], 0.04),
  },

  '& .fc .fc-license-message': { display: 'none' },
  '& .fc a': { color: theme.vars.palette.text.primary },

  // Table Head
  '& .fc .fc-col-header ': {
    boxShadow: `inset 0 -1px 0 ${theme.vars.palette.divider}`,
    '& th': { borderColor: 'transparent' },
    '& .fc-col-header-cell-cushion': {
      ...theme.typography.subtitle2,
      padding: '13px 0',
      textTransform: 'capitalize',
    },
  },

  // List Empty
  '& .fc .fc-list-empty': {
    ...theme.typography.h6,
    backgroundColor: 'transparent',
    color: theme.vars.palette.text.secondary,
  },

  // Event - Reset default styles for custom rendering
  '& .fc .fc-event': {
    borderColor: 'transparent !important',
    backgroundColor: 'transparent !important',
    boxShadow: 'none !important',
  },
  '& .fc .fc-event .fc-event-main': {
    padding: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  '& .fc .fc-event .fc-event-main-frame': {
    fontSize: 13,
    lineHeight: '20px',
  },
  '& .fc .fc-daygrid-event .fc-event-title': {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  '& .fc .fc-event .fc-event-time': {
    display: 'none', // Hide default time, we render custom
  },

  // Popover (more events)
  '& .fc .fc-popover': {
    border: 0,
    overflow: 'hidden',
    boxShadow: theme.customShadows.dropdown,
    borderRadius: theme.shape.borderRadius * 1.5,
    backgroundColor: theme.vars.palette.background.paper,
  },
  '& .fc .fc-popover-header': {
    ...theme.typography.subtitle2,
    padding: theme.spacing(1),
    backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
  },
  '& .fc .fc-popover-close': {
    opacity: 0.48,
    transition: theme.transitions.create(['opacity']),
    '&:hover': { opacity: 1 },
  },
  '& .fc .fc-more-popover .fc-popover-body': { padding: theme.spacing(1) },
  '& .fc .fc-popover-body': {
    '& .fc-daygrid-event.fc-event-start, & .fc-daygrid-event.fc-event-end': { margin: '2px 0' },
  },

  // Month View
  '& .fc .fc-day-other .fc-daygrid-day-top': {
    opacity: 1,
    '& .fc-daygrid-day-number': { color: theme.vars.palette.text.disabled },
  },
  '& .fc .fc-daygrid-day-number': {
    ...theme.typography.body2,
    padding: theme.spacing(1, 1, 0),
  },
  '& .fc .fc-daygrid-event': {
    marginTop: 4,
  },
  '& .fc .fc-daygrid-event.fc-event-start, & .fc .fc-daygrid-event.fc-event-end': {
    marginLeft: 4,
    marginRight: 4,
  },
  '& .fc .fc-daygrid-more-link': {
    ...theme.typography.caption,
    color: theme.vars.palette.text.secondary,
    fontWeight: 500,
    '&:hover': {
      backgroundColor: 'unset',
      textDecoration: 'underline',
      color: theme.vars.palette.primary.main,
    },
  },

  // Today highlight
  '& .fc .fc-day-today': {
    '& .fc-daygrid-day-number': {
      backgroundColor: theme.vars.palette.primary.main,
      color: theme.vars.palette.primary.contrastText,
      borderRadius: '50%',
      width: 28,
      height: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
    },
  },

  // Week & Day View
  '& .fc .fc-timegrid-axis-cushion': {
    ...theme.typography.caption,
    color: theme.vars.palette.text.secondary,
  },
  '& .fc .fc-timegrid-slot-label-cushion': {
    ...theme.typography.caption,
    color: theme.vars.palette.text.secondary,
  },
  '& .fc .fc-timegrid-slot': {
    height: '3em', // Taller slots for better visibility
  },

  // Now indicator
  '& .fc .fc-timegrid-now-indicator-line': {
    borderColor: theme.vars.palette.error.main,
    borderWidth: 2,
    '&::before': {
      content: '""',
      position: 'absolute',
      left: -6,
      top: -5,
      width: 12,
      height: 12,
      borderRadius: '50%',
      backgroundColor: theme.vars.palette.error.main,
    },
  },
  '& .fc .fc-timegrid-now-indicator-arrow': {
    display: 'none',
  },

  // Business hours (non-business time styling)
  '& .fc .fc-non-business': {
    backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.04),
  },

  // Time grid events
  '& .fc .fc-timegrid-event': {
    borderRadius: 6,
    '& .fc-event-main': {
      padding: 0,
    },
  },

  // Agenda/List View
  '& .fc-direction-ltr .fc-list-day-text, .fc-direction-rtl .fc-list-day-side-text, .fc-direction-ltr .fc-list-day-side-text, .fc-direction-rtl .fc-list-day-text':
    { ...theme.typography.subtitle2 },
  '& .fc .fc-list-event': {
    ...theme.typography.body2,
    '& .fc-list-event-time': { color: theme.vars.palette.text.secondary },
  },
  '& .fc .fc-list-table': { '& th, td': { borderColor: 'transparent' } },

  // Scrollbar styling
  '& .fc-scroller': {
    '&::-webkit-scrollbar': {
      width: 8,
      height: 8,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.24),
      borderRadius: 4,
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
  },
}));
