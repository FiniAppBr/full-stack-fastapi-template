import { useState } from 'react';
import PropTypes from 'prop-types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { BlockCard } from './block-card';
import { BLOCK_CONFIG } from './types';
import { blocksPropType } from './prop-types';

// ----------------------------------------------------------------------

export function BlockList({
  blocks,
  expandedBlock,
  onToggleBlock,
  onEditBlock,
  onDeleteBlock,
  onAddBlock,
  onReorderBlocks,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleAddBlock = (type) => {
    onAddBlock(type);
    handleCloseMenu();
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    if (source.index === destination.index) return;

    const reorderedBlocks = Array.from(blocks);
    const [movedBlock] = reorderedBlocks.splice(source.index, 1);
    reorderedBlocks.splice(destination.index, 0, movedBlock);

    if (onReorderBlocks) {
      onReorderBlocks(reorderedBlocks);
    }
  };

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

      {/* Blocks Stack - Scrollable */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2.5,
        }}
      >
        {blocks.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No blocks yet. Start chatting with Builder AI or add blocks manually.
            </Typography>
          </Box>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="blocks-list">
              {(provided, snapshot) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    minHeight: '100%',
                    width: '100%',
                    transition: 'background-color 0.2s ease',
                    bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                    borderRadius: 2,
                  }}
                >
                  {blocks.map((block, index) => (
                    <Draggable key={block.id} draggableId={`block-${block.id}`} index={index}>
                      {(providedDrag, snapshot) => (
                        <Box
                          ref={providedDrag.innerRef}
                          {...providedDrag.draggableProps}
                        >
                          <BlockCard
                            block={block}
                            expanded={expandedBlock === block.id}
                            onToggle={onToggleBlock}
                            onEdit={onEditBlock}
                            onDelete={onDeleteBlock}
                            isDragging={snapshot.isDragging}
                            dragHandleProps={providedDrag.dragHandleProps}
                          />
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </Box>

      {/* Add Block Button */}
      <Box
        sx={{
          p: 2,
          borderTop: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          size="large"
          startIcon={<Iconify icon="eva:plus-fill" />}
          endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
          onClick={handleOpenMenu}
        >
          Add Block
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleCloseMenu}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          {Object.entries(BLOCK_CONFIG).map(([type, config]) => (
            <MenuItem key={type} onClick={() => handleAddBlock(type)}>
              <Iconify icon={config.icon} width={20} sx={{ mr: 2, color: `${config.color}.main` }} />
              {config.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>
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
  onReorderBlocks: PropTypes.func,
};
