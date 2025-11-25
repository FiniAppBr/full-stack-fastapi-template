import { memo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useAgentForm } from '../agent-form-context';

// ----------------------------------------------------------------------

export const ActionsSection = memo(() => {
  const { enabledActions, toggleInArray } = useAgentForm();

  return (
    <Stack spacing={1.5}>
      {agentSchemas.actionTypes.map((action) => {
        const isEnabled = enabledActions.includes(action.id);
        const isDisabled = action.requiresIntegration;

        return (
          <Box
            key={action.id}
            onClick={() => !isDisabled && toggleInArray('enabledActions', action.id)}
            sx={{
              p: 2,
              borderRadius: 2,
              cursor: isDisabled ? 'default' : 'pointer',
              border: '1px solid',
              borderColor: isEnabled ? 'primary.main' : 'grey.200',
              bgcolor: isEnabled ? 'primary.lighter' : 'transparent',
              opacity: isDisabled ? 0.5 : 1,
              transition: 'all 0.2s',
              '&:hover': !isDisabled && { borderColor: 'primary.light' },
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isEnabled ? 'primary.main' : 'grey.100',
                  }}
                >
                  <Iconify
                    icon={action.icon}
                    width={18}
                    sx={{ color: isEnabled ? 'white' : 'text.secondary' }}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2">{action.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {action.description}
                  </Typography>
                </Box>
              </Stack>
              {isDisabled ? (
                <Chip label="Requer integração" size="small" variant="outlined" />
              ) : (
                <Switch checked={isEnabled} size="small" />
              )}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
});
