import PropTypes from 'prop-types';
import { Handle, Position } from '@xyflow/react';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

/**
 * AddNode - Square button node for adding new configuration
 */
export function AddNode({ data }) {
  const handleClick = () => {
    if (data?.onClick) {
      data.onClick(data?.nodeType);
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: 48,
        height: 48,
      }}
    >
      {/* Target Handle (left) */}
      <Handle type="target" position={Position.Left} />

      {/* Square Add Button */}
      <IconButton
        onClick={handleClick}
        sx={{
          width: 48,
          height: 48,
          border: 2,
          borderColor: 'grey.300',
          borderRadius: 1,
          bgcolor: 'background.paper',
          '&:hover': {
            bgcolor: 'grey.50',
            borderColor: 'grey.400',
          },
        }}
      >
        <Iconify icon="mdi:plus" width={24} sx={{ color: 'text.secondary' }} />
      </IconButton>
    </Box>
  );
}

AddNode.propTypes = {
  data: PropTypes.shape({
    nodeType: PropTypes.string,
    onClick: PropTypes.func,
  }),
};
