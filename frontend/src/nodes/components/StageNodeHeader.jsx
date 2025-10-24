import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { nodeStyles } from 'src/sections/agent/flowchart/node-styles';

// ----------------------------------------------------------------------

export function StageNodeHeader({ icon, label }) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        {icon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: 'action.hover',
              color: 'text.secondary',
            }}
          >
            <Iconify icon={icon} width={nodeStyles.iconSize.header} />
          </Box>
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}

StageNodeHeader.propTypes = {
  icon: PropTypes.string,
  label: PropTypes.string.isRequired,
};
