import PropTypes from 'prop-types';
import { Handle, Position } from '@xyflow/react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

/**
 * Input Pipeline Node
 * WhatsApp-styled entry point for customer messages
 */
export function InputNode({ data }) {
  return (
    <Box
      sx={{
        width: 320,
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: '2px solid #25D366',
        boxShadow: (theme) => theme.customShadows.z8,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Iconify icon="ic:baseline-whatsapp" width={40} sx={{ color: '#25D366' }} />

      <Typography
        variant="subtitle2"
        sx={{ fontWeight: (theme) => theme.typography.fontWeightSemiBold }}
      >
        Mensagem do cliente
      </Typography>

      <Handle type="source" position={Position.Bottom} />
    </Box>
  );
}

InputNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
  }),
};
