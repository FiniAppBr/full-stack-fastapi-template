import { useState } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { BLOCK_CONFIG } from './types';
import { BlockCard } from './block-card';
import { blocksPropType } from './prop-types';

// ----------------------------------------------------------------------

export function BlockSection({
  type,
  blocks,
  expandedBlock,
  onToggleBlock,
  onEditBlock,
  onDeleteBlock,
  onAddBlock,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const config = BLOCK_CONFIG[type];
  const sectionBlocks = blocks.filter((block) => block.block_type === type);

  return (
    <Box sx={{ mb: 2 }}>
      {/* Section Header */}
      <Box
        onClick={() => setCollapsed(!collapsed)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          borderRadius: 1,
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Iconify icon={config.icon} width={20} sx={{ color: `${config.color}.main` }} />
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          {config.label} ({sectionBlocks.length})
        </Typography>
        <Iconify
          icon={collapsed ? 'eva:arrow-ios-forward-fill' : 'eva:arrow-ios-downward-fill'}
          width={18}
        />
      </Box>

      {/* Section Content */}
      <Collapse in={!collapsed} timeout="auto">
        <Stack spacing={1} sx={{ pl: 1, pr: 1, pt: 1 }}>
          {sectionBlocks.length === 0 ? (
            <Typography variant="caption" color="text.disabled" sx={{ p: 2, textAlign: 'center' }}>
              No {config.label.toLowerCase()} blocks yet
            </Typography>
          ) : (
            sectionBlocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                expanded={expandedBlock === block.id}
                onToggle={onToggleBlock}
                onEdit={onEditBlock}
                onDelete={onDeleteBlock}
              />
            ))
          )}

          {/* Add Block Button */}
          <Button
            size="small"
            startIcon={<Iconify icon="eva:plus-fill" />}
            onClick={() => onAddBlock(type)}
            sx={{
              justifyContent: 'flex-start',
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            Add {config.label.toLowerCase().slice(0, -1)}
          </Button>
        </Stack>
      </Collapse>
    </Box>
  );
}

BlockSection.propTypes = {
  type: PropTypes.string.isRequired,
  blocks: blocksPropType.isRequired,
  expandedBlock: PropTypes.number,
  onToggleBlock: PropTypes.func,
  onEditBlock: PropTypes.func,
  onDeleteBlock: PropTypes.func,
  onAddBlock: PropTypes.func,
};
