import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';

import { Iconify } from 'src/components/iconify';

import {
  CARD_WIDTH,
  CARD_HEIGHT,
  COMPACT_CARD_WIDTH,
  COMPACT_CARD_HEIGHT,
  colorWithOpacity,
} from '../constants';

/**
 * Main card component for entity categories.
 * Tall portrait card (3:4 ratio) with hover animations.
 *
 * @param {Object} props
 * @param {Object} props.card - Card definition from card-definitions.js
 * @param {number} props.count - Number of entities in this category
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.isSelected - Whether card is currently selected
 * @param {boolean} props.compact - Compact horizontal mode for embedded use
 */
export function MainCard({
  card,
  count = 0,
  onClick,
  isSelected = false,
  compact = false,
}) {
  const { id, title, subtitle, icon, color } = card;

  if (compact) {
    return (
      <CompactMainCard
        card={card}
        count={count}
        onClick={onClick}
        isSelected={isSelected}
      />
    );
  }

  return (
    <ButtonBase
      component={m.div}
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      sx={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 2.5,
        gap: 2,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${colorWithOpacity(color, 0.08)} 0%, ${colorWithOpacity(color, 0.02)} 100%)`,
        border: '1px solid',
        borderColor: isSelected ? color : colorWithOpacity(color, 0.15),
        boxShadow: isSelected
          ? `0 0 0 2px ${colorWithOpacity(color, 0.3)}`
          : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          boxShadow: `0 8px 24px ${colorWithOpacity(color, 0.15)}`,
          borderColor: colorWithOpacity(color, 0.3),
        },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: colorWithOpacity(color, 0.12),
        }}
      >
        <Iconify icon={icon} width={36} sx={{ color }} />
      </Box>

      {/* Title */}
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          lineHeight: 1.3,
        }}
      >
        {title}
      </Typography>

      {/* Subtitle */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          lineHeight: 1.4,
          px: 1,
        }}
      >
        {subtitle}
      </Typography>

      {/* Count Badge */}
      {count > 0 && (
        <Chip
          size="small"
          label={count}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            height: 24,
            minWidth: 24,
            bgcolor: colorWithOpacity(color, 0.15),
            color,
            fontWeight: 700,
            fontSize: '0.75rem',
          }}
        />
      )}
    </ButtonBase>
  );
}

/**
 * Compact horizontal variant for embedded use
 */
function CompactMainCard({ card, count, onClick, isSelected }) {
  const { title, subtitle, icon, color } = card;

  return (
    <ButtonBase
      component={m.div}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      sx={{
        width: COMPACT_CARD_WIDTH,
        height: COMPACT_CARD_HEIGHT,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        textAlign: 'left',
        p: 2,
        gap: 2,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${colorWithOpacity(color, 0.06)} 0%, ${colorWithOpacity(color, 0.02)} 100%)`,
        border: '1px solid',
        borderColor: isSelected ? color : colorWithOpacity(color, 0.12),
        boxShadow: isSelected
          ? `0 0 0 2px ${colorWithOpacity(color, 0.25)}`
          : '0 1px 4px rgba(0,0,0,0.03)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: colorWithOpacity(color, 0.25),
          boxShadow: `0 4px 12px ${colorWithOpacity(color, 0.1)}`,
        },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: colorWithOpacity(color, 0.1),
          flexShrink: 0,
        }}
      >
        <Iconify icon={icon} width={26} sx={{ color }} />
      </Box>

      {/* Content */}
      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle2"
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

      {/* Count */}
      {count > 0 && (
        <Chip
          size="small"
          label={count}
          sx={{
            height: 22,
            minWidth: 22,
            bgcolor: colorWithOpacity(color, 0.12),
            color,
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      )}
    </ButtonBase>
  );
}
