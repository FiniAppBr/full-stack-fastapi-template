import { useState } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence } from 'framer-motion';
import { Droppable, Draggable, DragDropContext } from '@hello-pangea/dnd';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import SpeedDial from '@mui/material/SpeedDial';
import Typography from '@mui/material/Typography';
import SpeedDialAction from '@mui/material/SpeedDialAction';

import { Iconify } from 'src/components/iconify';

import { BLOCK_CONFIG } from './types';
import { BlockCard } from './block-card';
import { blocksPropType } from './prop-types';

// ----------------------------------------------------------------------

export function BlockList({
  blocks,
  onBlockClick,
  onDeleteBlock,
  onAddBlock,
  onReorderBlocks,
}) {
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  const handleSpeedDialOpen = () => setSpeedDialOpen(true);
  const handleSpeedDialClose = () => setSpeedDialOpen(false);

  const handleAddBlock = (type) => {
    onAddBlock(type);
    handleSpeedDialClose();
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
              {(provided, droppableSnapshot) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    minHeight: '100%',
                    width: '100%',
                    transition: 'background-color 0.2s ease',
                    bgcolor: droppableSnapshot.isDraggingOver ? 'action.hover' : 'transparent',
                    borderRadius: 2,
                  }}
                >
                  <AnimatePresence>
                    {blocks.map((block, index) => (
                      <Draggable key={block.id} draggableId={`block-${block.id}`} index={index}>
                        {(providedDrag, draggableSnapshot) => (
                          <Box
                            ref={providedDrag.innerRef}
                            {...providedDrag.draggableProps}
                          >
                            <BlockCard
                              block={block}
                              onClick={() => onBlockClick(block)}
                              onDelete={onDeleteBlock}
                              isDragging={draggableSnapshot.isDragging}
                              dragHandleProps={providedDrag.dragHandleProps}
                            />
                          </Box>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </Box>

      {/* Add Block Speed Dial */}
      <Box
        sx={{
          position: 'relative',
          height: 80,
          borderTop: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      >
        <SpeedDial
          ariaLabel="Add block"
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            '& .MuiSpeedDial-fab': {
              width: '100%',
              borderRadius: 1.5,
              height: 48,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              boxShadow: (theme) => theme.customShadows.z8,
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            },
            '& .MuiSpeedDial-actions': {
              gap: 0,
            },
            '& .MuiSpeedDial-actions > *': {
              marginBottom: '6px !important',
            },
          }}
          icon={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="eva:plus-fill" width={20} />
              <Typography variant="button" sx={{ fontWeight: 600 }}>
                Add Block
              </Typography>
            </Box>
          }
          onClose={handleSpeedDialClose}
          onOpen={handleSpeedDialOpen}
          open={speedDialOpen}
          direction="up"
        >
          {Object.entries(BLOCK_CONFIG).map(([type, config]) => (
            <SpeedDialAction
              key={type}
              icon={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2 }}>
                  <Iconify icon={config.icon} width={22} />
                  <Typography variant="button" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {config.label}
                  </Typography>
                </Box>
              }
              onClick={() => handleAddBlock(type)}
              FabProps={{
                sx: {
                  bgcolor: 'background.paper',
                  color: `${config.color}.dark`,
                  border: 1.5,
                  borderColor: `${config.color}.main`,
                  boxShadow: (theme) => theme.customShadows.z8,
                  width: 'auto',
                  minWidth: 140,
                  height: 44,
                  borderRadius: 1.5,
                  px: 2,
                  '&:hover': {
                    bgcolor: `${config.color}.main`,
                    color: 'white',
                    borderColor: `${config.color}.dark`,
                  },
                },
              }}
            />
          ))}
        </SpeedDial>
      </Box>
    </Paper>
  );
}

BlockList.propTypes = {
  blocks: blocksPropType.isRequired,
  onBlockClick: PropTypes.func,
  onDeleteBlock: PropTypes.func,
  onAddBlock: PropTypes.func,
  onReorderBlocks: PropTypes.func,
};
