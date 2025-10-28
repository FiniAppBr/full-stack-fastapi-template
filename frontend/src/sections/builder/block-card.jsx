import { m } from 'framer-motion';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { BLOCK_CONFIG } from './types';
import { blockPropType } from './prop-types';

// ----------------------------------------------------------------------

export function BlockCard({ block, index, onClick, onDelete, isDragging, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const config = BLOCK_CONFIG[block.block_type];

  return (
    <m.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        duration: 0.3,
      }}
      style={{ marginBottom: 16 }}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        onDragOver(e, index);
      }}
      onDragEnd={(e) => {
        onDrop();
        onDragEnd();
      }}
    >
      <Card
        sx={{
          transition: isDragging ? 'none' : 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          borderLeft: 4,
          borderColor: `${config.color}.main`,
          opacity: isDragging ? 0.5 : 1,
          transform: isDragging ? 'rotate(3deg)' : 'none',
          boxShadow: isDragging
            ? (theme) => theme.customShadows.z24
            : (theme) => theme.customShadows.z8,
          '&:hover': {
            boxShadow: (theme) => theme.customShadows.z16,
            transform: isDragging ? 'rotate(3deg)' : 'translateY(-2px)',
            cursor: 'pointer',
          },
          overflow: 'hidden',
        }}
      >
      <Box sx={{ position: 'relative', p: 2.5 }}>
        {/* Delete Button - Top Right */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(block.id);
          }}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'text.disabled',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
            },
          }}
        >
          <Iconify icon="eva:close-fill" width={20} />
        </IconButton>

        {/* Content */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 3 }}>
          {/* Icon */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${config.color}.lighter`,
              color: `${config.color}.main`,
            }}
          >
            <Iconify icon={config.icon} width={24} />
          </Box>

          {/* Title Area (Draggable) */}
          <Box
            onClick={onClick}
            sx={{
              flex: 1,
              minWidth: 0,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 0.25,
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {block.name}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {config.label}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Card>
    </m.div>
  );
}

BlockCard.propTypes = {
  block: blockPropType.isRequired,
  index: PropTypes.number.isRequired,
  onClick: PropTypes.func,
  onDelete: PropTypes.func,
  isDragging: PropTypes.bool,
  onDragStart: PropTypes.func,
  onDragOver: PropTypes.func,
  onDrop: PropTypes.func,
  onDragEnd: PropTypes.func,
};
