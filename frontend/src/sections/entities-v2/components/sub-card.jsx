import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';

import { Iconify } from 'src/components/iconify';

import { CARD_WIDTH, CARD_HEIGHT, COMPACT_CARD_WIDTH, COMPACT_CARD_HEIGHT, colorWithOpacity } from '../constants';

/**
 * Subcard component for entity subcategories.
 * Portrait card (3:4 ratio) matching main cards style.
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

  const width = compact ? COMPACT_CARD_WIDTH : CARD_WIDTH;
  const height = compact ? COMPACT_CARD_HEIGHT : CARD_HEIGHT;

  return (
    <ButtonBase
      component={m.div}
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      sx={{
        width,
        height,
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: compact ? 1.5 : 2,
        gap: compact ? 1 : 1.5,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: colorWithOpacity(color, 0.4),
          boxShadow: `0 8px 24px ${colorWithOpacity(color, 0.15)}`,
        },
      }}
    >
      {/* Count badge */}
      {count > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 22,
            height: 22,
            borderRadius: '11px',
            bgcolor: color,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            px: 0.75,
          }}
        >
          {count}
        </Box>
      )}

      {/* Icon */}
      <Box
        sx={{
          width: compact ? 48 : 64,
          height: compact ? 48 : 64,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: colorWithOpacity(color, 0.1),
        }}
      >
        <Iconify
          icon={icon}
          width={compact ? 28 : 36}
          sx={{ color }}
        />
      </Box>

      {/* Content */}
      <Stack spacing={0.25} alignItems="center">
        <Typography
          variant={compact ? 'body2' : 'subtitle2'}
          sx={{
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        {!compact && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              lineHeight: 1.3,
              maxWidth: '90%',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Stack>
    </ButtonBase>
  );
}
