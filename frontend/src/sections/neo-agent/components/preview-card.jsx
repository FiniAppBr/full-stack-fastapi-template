import { memo } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const PreviewCard = memo(({ title, icon, onReset, showReset = false, children }) => (
  <Paper
    elevation={0}
    sx={{
      width: { xs: '100%', sm: 340 },
      height: { xs: 'auto', sm: 'calc(100vh - 220px)' },
      maxHeight: { xs: 500, sm: 700 },
      minHeight: { xs: 300, sm: 400 },
      borderRadius: { xs: 2, sm: 3 },
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.paper',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    }}
  >
    {/* Header */}
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        px: 2,
        py: 1.25,
        borderBottom: '1px solid',
        borderColor: 'grey.100',
        bgcolor: 'grey.50',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        {icon && (
          <Iconify icon={icon} width={16} sx={{ color: 'text.secondary' }} />
        )}
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {title}
        </Typography>
      </Stack>
      {showReset && onReset && (
        <IconButton size="small" onClick={onReset} sx={{ color: 'text.secondary' }}>
          <Iconify icon="solar:restart-bold" width={16} />
        </IconButton>
      )}
    </Stack>

    {/* Content */}
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {children}
    </Box>
  </Paper>
));
