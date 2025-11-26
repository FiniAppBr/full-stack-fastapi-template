import { memo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useFormField, useFormActions } from '../agent-form-context';

// ----------------------------------------------------------------------

export const ChannelsSection = memo(() => {
  const enabledChannels = useFormField('enabledChannels');
  const { toggleInArray } = useFormActions();

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: 'repeat(3, 1fr)',
      }}
    >
      {agentSchemas.channels.map((channel) => {
        const isEnabled = enabledChannels.includes(channel.id);

        return (
          <Box
            key={channel.id}
            onClick={() => toggleInArray('enabledChannels', channel.id)}
            sx={{
              p: 2,
              borderRadius: 2,
              cursor: 'pointer',
              textAlign: 'center',
              border: '1px solid',
              borderColor: isEnabled ? channel.color : 'grey.200',
              bgcolor: isEnabled ? `${channel.color}08` : 'transparent',
              transition: 'all 0.2s',
              '&:hover': { borderColor: channel.color },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${channel.color}15`,
                mx: 'auto',
                mb: 1,
              }}
            >
              <Iconify icon={channel.icon} width={22} sx={{ color: channel.color }} />
            </Box>
            <Typography variant="body2" fontWeight={500}>
              {channel.name}
            </Typography>
            {isEnabled && (
              <Chip
                label="Ativo"
                size="small"
                sx={{ mt: 1, bgcolor: channel.color, color: 'white', height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
});
