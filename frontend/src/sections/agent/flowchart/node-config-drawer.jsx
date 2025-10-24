import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { StageConfigContent } from './config/stage-config-content';

// ----------------------------------------------------------------------

export function NodeConfigDrawer({ open, onClose, selectedNode }) {
  // Determine node type and title
  const getNodeTitle = () => {
    if (!selectedNode) return 'Node Configuration';

    switch (selectedNode.type) {
      case 'stage':
        return 'Stage Configuration';
      case 'agent':
        return 'Agent Settings';
      case 'successEnd':
        return 'Success End State';
      case 'escalatedEnd':
        return 'Escalated End State';
      default:
        return 'Node Configuration';
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      hideBackdrop
      ModalProps={{
        disablePortal: false,
        disableEnforceFocus: true,
        disableAutoFocus: true,
        style: { pointerEvents: 'none' },
      }}
      PaperProps={{
        sx: {
          width: 600,
          bgcolor: 'background.default',
          pointerEvents: 'auto',
        },
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        sx={{
          py: 2,
          pr: 1,
          pl: 2.5,
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {getNodeTitle()}
        </Typography>

        <IconButton onClick={onClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      {/* Scrollable Content */}
      <Scrollbar>
        <Stack spacing={3} sx={{ px: 2.5, py: 3 }}>
          {!selectedNode && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Select a node to configure
            </Typography>
          )}

          {selectedNode?.type === 'stage' && <StageConfigContent node={selectedNode} />}

          {selectedNode?.type === 'agent' && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Agent configuration coming soon
            </Typography>
          )}

          {(selectedNode?.type === 'successEnd' || selectedNode?.type === 'escalatedEnd') && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              End state configuration coming soon
            </Typography>
          )}
        </Stack>
      </Scrollbar>
    </Drawer>
  );
}

NodeConfigDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedNode: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
    data: PropTypes.shape({}),
  }),
};
