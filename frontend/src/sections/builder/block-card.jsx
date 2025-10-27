import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Accordion from '@mui/material/Accordion';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { Iconify } from 'src/components/iconify';

import { blockPropType } from './prop-types';
import { BLOCK_TYPES, BLOCK_CONFIG } from './types';

// ----------------------------------------------------------------------

export function BlockCard({ block, expanded, onToggle, onEdit, onDelete, isDragging, dragHandleProps }) {
  const config = BLOCK_CONFIG[block.block_type];

  const renderPreview = () => {
    switch (block.block_type) {
      case BLOCK_TYPES.KNOWLEDGE:
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {block.content_type && (
              <Chip label={block.content_type} size="small" variant="soft" />
            )}
            {block.file_path && (
              <Typography variant="caption" color="text.secondary">
                📎 {block.file_path}
              </Typography>
            )}
          </Box>
        );

      case BLOCK_TYPES.PERSONALITY:
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {block.tone && <Chip label={block.tone} size="small" variant="soft" />}
            {block.use_emojis && <Chip label="Emojis" size="small" variant="soft" />}
          </Box>
        );

      case BLOCK_TYPES.ACTION:
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {block.action_type && (
              <Chip label={block.action_type} size="small" variant="soft" />
            )}
            {block.requires_confirmation && (
              <Chip label="Requires confirmation" size="small" color="warning" variant="soft" />
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const renderExpandedContent = () => {
    switch (block.block_type) {
      case BLOCK_TYPES.KNOWLEDGE:
        return (
          <Stack spacing={1.5}>
            {block.content && (
              <Box>
                <Typography variant="caption" color="text.disabled" sx={{ mb: 0.5, display: 'block' }}>
                  Content:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {block.content.substring(0, 200)}
                  {block.content.length > 200 && '...'}
                </Typography>
              </Box>
            )}
          </Stack>
        );

      case BLOCK_TYPES.PERSONALITY:
        return (
          <Stack spacing={1.5} sx={{ minHeight: 40 }}>
            {block.response_length && (
              <Box>
                <Typography variant="caption" color="text.disabled">
                  Response length: {block.response_length}
                </Typography>
              </Box>
            )}
            {block.languages && block.languages.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.disabled" sx={{ mb: 0.5, display: 'block' }}>
                  Languages:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {block.languages.map((lang) => (
                    <Chip key={lang} label={lang.toUpperCase()} size="small" variant="soft" />
                  ))}
                </Box>
              </Box>
            )}
            {!block.response_length && (!block.languages || block.languages.length === 0) && (
              <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                No personality settings configured
              </Typography>
            )}
          </Stack>
        );

      case BLOCK_TYPES.ACTION:
        return (
          <Stack spacing={1.5} sx={{ minHeight: 40 }}>
            {block.description ? (
              <Typography variant="body2" color="text.secondary">
                {block.description}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                No description provided
              </Typography>
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={() => onToggle(block.id)}
      sx={{
        mb: 2,
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
        },
        '&:before': {
          display: 'none',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<Iconify icon="eva:chevron-down-fill" width={20} />}
        sx={{
          px: 2.5,
          '& .MuiAccordionSummary-content': {
            my: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
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

          <Box
            {...dragHandleProps}
            sx={{
              flex: 1,
              minWidth: 0,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
              {block.name}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {config.label}
            </Typography>
          </Box>

          {/* Preview (when collapsed) */}
          {!expanded && <Box sx={{ ml: 'auto', mr: 2 }}>{renderPreview()}</Box>}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
        {block.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {block.description}
          </Typography>
        )}

        {renderExpandedContent()}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(block);
            }}
            sx={{
              bgcolor: 'primary.lighter',
              '&:hover': { bgcolor: 'primary.light' },
            }}
          >
            <Iconify icon="solar:pen-bold" width={16} />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(block.id);
            }}
            sx={{
              bgcolor: 'error.lighter',
              '&:hover': { bgcolor: 'error.light' },
            }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
          </IconButton>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

BlockCard.propTypes = {
  block: blockPropType.isRequired,
  expanded: PropTypes.bool,
  onToggle: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isDragging: PropTypes.bool,
  dragHandleProps: PropTypes.shape({}),
};
