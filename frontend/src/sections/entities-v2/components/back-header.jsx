import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

import { ANIMATION_EASE, ANIMATION_DURATION } from '../constants';

/**
 * Header component with back button and title.
 * Used in subcards and entity list views.
 *
 * @param {Object} props
 * @param {string} props.title - Header title
 * @param {string} props.subtitle - Optional subtitle
 * @param {string} props.icon - Optional icon name
 * @param {string} props.color - Color for icon and accents
 * @param {Function} props.onBack - Callback when back button clicked
 * @param {React.ReactNode} props.action - Optional action button on the right
 * @param {boolean} props.compact - Compact mode for embedded use
 */
export function BackHeader({
  title,
  subtitle,
  icon,
  color,
  onBack,
  action,
  compact = false,
}) {
  return (
    <Stack
      component={m.div}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASE }}
      direction="row"
      alignItems="center"
      spacing={compact ? 1.5 : 2}
      sx={{
        mb: compact ? 2 : 3,
        pb: compact ? 1.5 : 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Back Button */}
      <IconButton
        onClick={onBack}
        sx={{
          width: compact ? 36 : 40,
          height: compact ? 36 : 40,
          bgcolor: 'background.neutral',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Iconify icon="eva:arrow-back-fill" width={compact ? 18 : 20} />
      </IconButton>

      {/* Icon */}
      {icon && (
        <Box
          sx={{
            width: compact ? 40 : 48,
            height: compact ? 40 : 48,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: color ? `${color}15` : 'primary.lighter',
            flexShrink: 0,
          }}
        >
          <Iconify
            icon={icon}
            width={compact ? 22 : 26}
            sx={{ color: color || 'primary.main' }}
          />
        </Box>
      )}

      {/* Title + Subtitle */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant={compact ? 'subtitle1' : 'h6'}
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Action */}
      {action}
    </Stack>
  );
}
