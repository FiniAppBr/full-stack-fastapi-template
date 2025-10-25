import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/components/iconify';

import { blockPropType } from './prop-types';
import { BLOCK_TYPES, BLOCK_CONFIG } from './types';

// ----------------------------------------------------------------------

export function BlockCard({ block, expanded, onToggle, onEdit, onDelete }) {
  const config = BLOCK_CONFIG[block.block_type];

  const renderContent = () => {
    switch (block.block_type) {
      case BLOCK_TYPES.KNOWLEDGE:
        return (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Type: {block.content_type || 'text'}
            </Typography>
            {block.content && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {block.content.substring(0, 100)}
                {block.content.length > 100 && '...'}
              </Typography>
            )}
            {block.file_path && (
              <Typography variant="caption" color="primary">
                📎 {block.file_path}
              </Typography>
            )}
          </Stack>
        );

      case BLOCK_TYPES.PERSONALITY:
        return (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {block.tone && <Chip label={block.tone} size="small" variant="soft" />}
              {block.use_emojis && <Chip label="Emojis" size="small" variant="soft" />}
              {block.languages?.map((lang) => (
                <Chip key={lang} label={lang.toUpperCase()} size="small" variant="soft" />
              ))}
            </Box>
            {block.response_length && (
              <Typography variant="body2" color="text.secondary">
                Response length: {block.response_length}
              </Typography>
            )}
          </Stack>
        );

      case BLOCK_TYPES.ACTION:
        return (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Type: {block.action_type || 'custom'}
            </Typography>
            {block.requires_confirmation && (
              <Chip label="Requires confirmation" size="small" color="warning" variant="soft" />
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Card
      sx={{
        mb: 1,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: (theme) => theme.customShadows.z8,
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Iconify icon={config.icon} width={20} sx={{ color: `${config.color}.main` }} />
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              {block.name}
            </Typography>
            <IconButton size="small" onClick={() => onToggle(block.id)}>
              <Iconify
                icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                width={18}
              />
            </IconButton>
          </Box>

          {/* Description */}
          {block.description && !expanded && (
            <Typography variant="caption" color="text.secondary">
              {block.description}
            </Typography>
          )}

          {/* Expandable content */}
          <Collapse in={expanded} timeout="auto">
            <Stack spacing={2} sx={{ pt: 1 }}>
              {block.description && (
                <Typography variant="body2" color="text.secondary">
                  {block.description}
                </Typography>
              )}

              {renderContent()}

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onEdit(block)}
                  sx={{ '&:hover': { bgcolor: 'primary.lighter' } }}
                >
                  <Iconify icon="eva:edit-2-fill" width={18} />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(block.id)}
                  sx={{ '&:hover': { bgcolor: 'error.lighter' } }}
                >
                  <Iconify icon="eva:trash-2-fill" width={18} />
                </IconButton>
              </Box>
            </Stack>
          </Collapse>
        </Stack>
      </CardContent>
    </Card>
  );
}

BlockCard.propTypes = {
  block: blockPropType.isRequired,
  expanded: PropTypes.bool,
  onToggle: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};
