import dayjs from 'dayjs';
import { memo, useEffect, forwardRef } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import { alpha, styled, useTheme } from '@mui/material/styles';
import AvatarGroup, { avatarGroupClasses } from '@mui/material/AvatarGroup';

import { varAlpha, stylesMode } from 'src/theme/styles';

import { Iconify } from 'src/components/iconify';
import { imageClasses } from 'src/components/image';

import { kanbanClasses } from '../classes';

// ----------------------------------------------------------------------

// Priority colors
const PRIORITY_COLORS = {
  low: { main: '#00B8D9', light: '#E3FCEF' },
  medium: { main: '#FFAB00', light: '#FFF7CD' },
  high: { main: '#FF5630', light: '#FFE7D9' },
};

// Label colors (cycle through these)
const LABEL_COLORS = [
  '#00B8D9', '#36B37E', '#6554C0', '#FF5630', '#FFAB00',
  '#00875A', '#5243AA', '#FF8B00', '#0052CC', '#172B4D'
];

const getLabelColor = (label, index) => {
  const hash = label.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return LABEL_COLORS[hash % LABEL_COLORS.length];
};

export const StyledItemWrap = styled(ListItem)(() => ({
  '@keyframes fadeIn': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
  transform:
    'translate3d(var(--translate-x, 0), var(--translate-y, 0), 0) scaleX(var(--scale-x, 1)) scaleY(var(--scale-y, 1))',
  transformOrigin: '0 0',
  touchAction: 'manipulation',
  [`&.${kanbanClasses.state.fadeIn}`]: { animation: 'fadeIn 500ms ease' },
  [`&.${kanbanClasses.state.dragOverlay}`]: { zIndex: 999 },
}));

export const StyledItem = styled(Stack)(({ theme }) => ({
  width: '100%',
  cursor: 'grab',
  outline: 'none',
  overflow: 'hidden',
  position: 'relative',
  transformOrigin: '50% 50%',
  touchAction: 'manipulation',
  borderRadius: 'var(--item-radius)',
  WebkitTapHighlightColor: 'transparent',
  backgroundColor: theme.vars.palette.common.white,
  border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
  transition: theme.transitions.create(['box-shadow', 'border-color', 'transform']),
  [stylesMode.dark]: {
    backgroundColor: theme.vars.palette.grey[900],
    borderColor: alpha(theme.palette.grey[500], 0.24),
  },
  '&:hover': {
    borderColor: alpha(theme.palette.primary.main, 0.4),
    boxShadow: `0 4px 12px 0 ${alpha(theme.palette.grey[500], 0.16)}`,
  },
  [`&.${kanbanClasses.state.disabled}`]: {},
  [`&.${kanbanClasses.state.sorting}`]: {},
  [`&.${kanbanClasses.state.dragOverlay}`]: {
    backdropFilter: `blur(6px)`,
    boxShadow: theme.customShadows.z20,
    backgroundColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.48),
    [stylesMode.dark]: { backgroundColor: varAlpha(theme.vars.palette.grey['900Channel'], 0.48) },
  },
  [`&.${kanbanClasses.state.dragging}`]: { opacity: 0.2, filter: 'grayscale(1)' },
}));

const ItemBase = forwardRef(({ task, stateProps, sx, ...other }, ref) => {
  const theme = useTheme();
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;

  useEffect(() => {
    if (!stateProps?.dragOverlay) {
      return;
    }

    document.body.style.cursor = 'grabbing';

    // eslint-disable-next-line consistent-return
    return () => {
      document.body.style.cursor = '';
    };
  }, [stateProps?.dragOverlay]);

  const itemWrapClassName = kanbanClasses.itemWrap.concat(
    (stateProps?.fadeIn && ` ${kanbanClasses.state.fadeIn}`) ||
      (stateProps?.dragOverlay && ` ${kanbanClasses.state.dragOverlay}`) ||
      ''
  );

  const itemClassName = kanbanClasses.item.concat(
    (stateProps?.dragging && ` ${kanbanClasses.state.dragging}`) ||
      (stateProps?.disabled && ` ${kanbanClasses.state.disabled}`) ||
      (stateProps?.sorting && ` ${kanbanClasses.state.sorting}`) ||
      (stateProps?.dragOverlay && ` ${kanbanClasses.state.dragOverlay}`) ||
      ''
  );

  // Priority indicator bar on left
  const renderPriorityBar = (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        bgcolor: priorityColor.main,
        borderRadius: '12px 0 0 12px',
      }}
    />
  );

  // Priority badge
  const renderPriorityBadge = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: alpha(priorityColor.main, 0.12),
        color: priorityColor.main,
      }}
    >
      <Iconify
        width={14}
        icon={
          (task.priority === 'low' && 'solar:double-alt-arrow-down-bold-duotone') ||
          (task.priority === 'medium' && 'solar:double-alt-arrow-right-bold-duotone') ||
          'solar:double-alt-arrow-up-bold-duotone'
        }
      />
      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
        {task.priority}
      </Typography>
    </Box>
  );

  const renderImg = !!task?.attachments?.length && (
    <Box sx={{ p: theme.spacing(1, 1, 0, 1) }}>
      <Box
        component="img"
        className={imageClasses.root}
        alt={task?.attachments?.[0]}
        src={task?.attachments?.[0]}
        sx={{
          width: '100%',
          height: 'auto',
          borderRadius: 1.5,
          aspectRatio: '16/9',
          objectFit: 'cover',
        }}
      />
    </Box>
  );

  // Labels display
  const renderLabels = !!task?.labels?.length && (
    <Stack direction="row" flexWrap="wrap" gap={0.5}>
      {task.labels.slice(0, 3).map((label, index) => (
        <Chip
          key={label}
          label={label}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 500,
            bgcolor: alpha(getLabelColor(label, index), 0.12),
            color: getLabelColor(label, index),
            border: `1px solid ${alpha(getLabelColor(label, index), 0.24)}`,
            '& .MuiChip-label': { px: 1 },
          }}
        />
      ))}
      {task.labels.length > 3 && (
        <Chip
          label={`+${task.labels.length - 3}`}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 500,
            bgcolor: alpha(theme.palette.grey[500], 0.12),
            color: theme.palette.text.secondary,
          }}
        />
      )}
    </Stack>
  );

  // Contact info
  const renderContactInfo = (task.contact_phone || task.contact_email) && (
    <Stack spacing={0.5} sx={{ mt: 1 }}>
      {task.contact_phone && (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Iconify icon="solar:phone-bold" width={14} sx={{ color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {task.contact_phone}
          </Typography>
        </Stack>
      )}
      {task.contact_email && (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Iconify icon="solar:letter-bold" width={14} sx={{ color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
            {task.contact_email}
          </Typography>
        </Stack>
      )}
    </Stack>
  );

  // Due date
  const renderDueDate = task?.due?.[0] && (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Iconify icon="solar:calendar-bold" width={14} sx={{ color: 'text.secondary' }} />
      <Typography
        variant="caption"
        sx={{
          color: dayjs(task.due[0]).isBefore(dayjs()) ? 'error.main' : 'text.secondary',
          fontWeight: dayjs(task.due[0]).isBefore(dayjs()) ? 600 : 400,
        }}
      >
        {dayjs(task.due[0]).format('DD MMM')}
      </Typography>
    </Stack>
  );

  const renderInfo = (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        {renderDueDate}

        {!!task?.comments?.length && (
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <Iconify width={14} icon="solar:chat-round-dots-bold" sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {task.comments.length}
            </Typography>
          </Stack>
        )}

        {!!task?.attachments?.length && (
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <Iconify width={14} icon="eva:attach-2-fill" sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {task.attachments.length}
            </Typography>
          </Stack>
        )}
      </Stack>

      {!!task?.assignee?.length && (
        <AvatarGroup
          max={3}
          sx={{
            [`& .${avatarGroupClasses.avatar}`]: {
              width: 24,
              height: 24,
              fontSize: '0.75rem',
              border: `2px solid ${theme.palette.background.paper}`,
            }
          }}
        >
          {task.assignee.map((user) => (
            <Avatar key={user.id} alt={user.name} src={user.avatarUrl} />
          ))}
        </AvatarGroup>
      )}
    </Stack>
  );

  return (
    <StyledItemWrap
      ref={ref}
      disablePadding
      className={itemWrapClassName}
      sx={{
        ...(!!stateProps?.transition && { transition: stateProps.transition }),
        ...(!!stateProps?.transform && {
          '--translate-x': `${Math.round(stateProps.transform.x)}px`,
          '--translate-y': `${Math.round(stateProps.transform.y)}px`,
          '--scale-x': `${stateProps.transform.scaleX}`,
          '--scale-y': `${stateProps.transform.scaleY}`,
        }),
      }}
    >
      <StyledItem
        className={itemClassName}
        data-cypress="draggable-item"
        sx={sx}
        tabIndex={0}
        {...stateProps?.listeners}
        {...other}
      >
        {renderPriorityBar}
        {renderImg}

        <Stack spacing={1} sx={{ px: 2, py: 2, pl: 2.5 }}>
          {/* Header: Name + Priority */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
              {task.name}
            </Typography>
            {renderPriorityBadge}
          </Stack>

          {/* Labels */}
          {renderLabels}

          {/* Contact Info */}
          {renderContactInfo}

          {/* Description preview */}
          {task.description && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {task.description}
            </Typography>
          )}

          {/* Footer: Info */}
          {renderInfo}
        </Stack>
      </StyledItem>
    </StyledItemWrap>
  );
});

export default memo(ItemBase);
