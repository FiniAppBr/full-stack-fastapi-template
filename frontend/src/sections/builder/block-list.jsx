import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import { Scrollbar } from 'src/components/scrollbar';

import { BLOCK_TYPES } from './types';
import { blocksPropType } from './prop-types';
import { BlockSection } from './block-section';

// ----------------------------------------------------------------------

export function BlockList({
  blocks,
  expandedBlock,
  onToggleBlock,
  onEditBlock,
  onDeleteBlock,
  onAddBlock,
}) {
  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6">Agent Configuration</Typography>
        <Typography variant="caption" color="text.secondary">
          {blocks.length} block{blocks.length !== 1 ? 's' : ''} configured
        </Typography>
      </Box>

      {/* Block Sections */}
      <Scrollbar sx={{ flexGrow: 1, p: 2 }}>
        <BlockSection
          type={BLOCK_TYPES.KNOWLEDGE}
          blocks={blocks}
          expandedBlock={expandedBlock}
          onToggleBlock={onToggleBlock}
          onEditBlock={onEditBlock}
          onDeleteBlock={onDeleteBlock}
          onAddBlock={onAddBlock}
        />

        <BlockSection
          type={BLOCK_TYPES.PERSONALITY}
          blocks={blocks}
          expandedBlock={expandedBlock}
          onToggleBlock={onToggleBlock}
          onEditBlock={onEditBlock}
          onDeleteBlock={onDeleteBlock}
          onAddBlock={onAddBlock}
        />

        <BlockSection
          type={BLOCK_TYPES.ACTION}
          blocks={blocks}
          expandedBlock={expandedBlock}
          onToggleBlock={onToggleBlock}
          onEditBlock={onEditBlock}
          onDeleteBlock={onDeleteBlock}
          onAddBlock={onAddBlock}
        />
      </Scrollbar>
    </Paper>
  );
}

BlockList.propTypes = {
  blocks: blocksPropType.isRequired,
  expandedBlock: PropTypes.number,
  onToggleBlock: PropTypes.func,
  onEditBlock: PropTypes.func,
  onDeleteBlock: PropTypes.func,
  onAddBlock: PropTypes.func,
};
