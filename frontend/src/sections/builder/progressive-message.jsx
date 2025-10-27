import { m } from 'framer-motion';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const STAGE_LABELS = {
  uploading: 'Uploading file',
  analyzing: 'Analyzing content',
  processing: 'Processing information',
  creating: 'Creating knowledge block',
  complete: 'Block created successfully',
};

// ----------------------------------------------------------------------

export function ProgressiveMessage({ fileName, stage, progress, blockName, onConfigure }) {
  const isComplete = stage === 'complete';
  const currentLabel = STAGE_LABELS[stage] || 'Processing...';

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        sx={{
          p: 2.5,
          borderRadius: 1.5,
          bgcolor: 'background.neutral',
          maxWidth: 480,
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          {isComplete ? (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <Iconify icon="eva:checkmark-fill" width={20} />
              </Box>
            </m.div>
          ) : (
            <CircularProgress size={32} thickness={4} />
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25 }}>
              {fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentLabel}
            </Typography>
          </Box>
        </Stack>

        {/* Progress Bar */}
        {!isComplete && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: (theme) => theme.palette.grey[300],
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  transition: 'transform 0.4s ease',
                },
              }}
            />
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}
            >
              {Math.round(progress)}%
            </Typography>
          </m.div>
        )}

        {/* Complete State - Configure Button */}
        {isComplete && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="small"
                onClick={onConfigure}
                startIcon={<Iconify icon="solar:settings-bold" width={18} />}
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Configure Block
              </Button>
            </Stack>
          </m.div>
        )}
      </Box>
    </m.div>
  );
}

ProgressiveMessage.propTypes = {
  fileName: PropTypes.string.isRequired,
  stage: PropTypes.oneOf(['uploading', 'analyzing', 'processing', 'creating', 'complete']).isRequired,
  progress: PropTypes.number.isRequired,
  blockName: PropTypes.string,
  onConfigure: PropTypes.func,
};
