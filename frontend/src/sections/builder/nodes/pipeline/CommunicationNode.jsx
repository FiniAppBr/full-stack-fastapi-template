import PropTypes from 'prop-types';
import { Handle, Position } from '@xyflow/react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

/**
 * Communication Node (Input/Output)
 * Generic node for any communication channel (WhatsApp, Telegram, Instagram, etc.)
 */

// Channel configurations
const CHANNEL_CONFIG = {
  whatsapp: {
    icon: 'ic:baseline-whatsapp',
    color: '#25D366',
    name: 'WhatsApp',
  },
  telegram: {
    icon: 'ic:baseline-telegram',
    color: '#0088cc',
    name: 'Telegram',
  },
  instagram: {
    icon: 'mdi:instagram',
    color: '#E4405F',
    name: 'Instagram',
  },
};

export function CommunicationNode({ data }) {
  const channel = data?.channel || 'whatsapp';
  const direction = data?.direction || 'input'; // 'input' or 'output'
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.whatsapp;

  const label = direction === 'input' ? 'Mensagem do cliente' : 'Enviar mensagem';

  return (
    <Box
      sx={{
        width: 320,
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: `2px solid ${config.color}`,
        boxShadow: (theme) => theme.customShadows.z8,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      {/* Only show target handle for output nodes */}
      {direction === 'output' && <Handle type="target" position={Position.Top} />}

      <Iconify icon={config.icon} width={40} sx={{ color: config.color }} />

      <Box sx={{ flex: 1 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: 'text.secondary',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {config.name}
        </Typography>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: (theme) => theme.typography.fontWeightSemiBold }}
        >
          {label}
        </Typography>
      </Box>

      {/* Only show source handle for input nodes */}
      {direction === 'input' && <Handle type="source" position={Position.Bottom} />}
    </Box>
  );
}

CommunicationNode.propTypes = {
  data: PropTypes.shape({
    channel: PropTypes.oneOf(['whatsapp', 'telegram', 'instagram']),
    direction: PropTypes.oneOf(['input', 'output']),
  }),
};
