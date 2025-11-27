import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';

import { Iconify } from 'src/components/iconify';

import { SUBCARD_HEIGHT, colorWithOpacity } from '../constants';

/**
 * Subcard component for entity subcategories.
 * Horizontal card with icon, title, subtitle, and count.
 *
 * @param {Object} props
 * @param {Object} props.subcard - Subcard definition
 * @param {string} props.parentColor - Color from parent main card
 * @param {number} props.count - Number of entities in this subcategory
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.compact - Compact mode for embedded use
 */
export function SubCard({
  subcard,
  parentColor,
  count = 0,
  onClick,
  compact = false,
}) {
  const { title, subtitle, icon } = subcard;
  const color = parentColor;

  return (
    <ButtonBase
      component={m.div}
      onClick={onClick}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      sx={{
        width: '100%',
        height: compact ? SUBCARD_HEIGHT - 16 : SUBCARD_HEIGHT,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        textAlign: 'left',
        px: compact ? 1.5 : 2,
        py: compact ? 1 : 1.5,
        gap: compact ? 1.5 : 2,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color 0.2s, background-color 0.2s',
        '&:hover': {
          borderColor: colorWithOpacity(color, 0.3),
          bgcolor: colorWithOpacity(color, 0.04),
        },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: compact ? 36 : 44,
          height: compact ? 36 : 44,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: colorWithOpacity(color, 0.1),
          flexShrink: 0,
        }}
      >
        <Iconify
          icon={icon}
          width={compact ? 20 : 24}
          sx={{ color }}
        />
      </Box>

      {/* Content */}
      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant={compact ? 'body2' : 'subtitle2'}
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subtitle}
        </Typography>
      </Stack>

      {/* Count + Arrow */}
      <Stack direction="row" alignItems="center" spacing={1}>
        {count > 0 && (
          <Chip
            size="small"
            label={count}
            sx={{
              height: 22,
              minWidth: 22,
              bgcolor: colorWithOpacity(color, 0.1),
              color,
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        )}
        <Iconify
          icon="eva:chevron-right-fill"
          width={20}
          sx={{ color: 'text.disabled' }}
        />
      </Stack>
    </ButtonBase>
  );
}
