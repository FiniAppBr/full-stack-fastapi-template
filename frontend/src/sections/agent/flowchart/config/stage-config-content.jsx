import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { StageNodeContent } from 'src/nodes/components/StageNodeContent';

// ----------------------------------------------------------------------

export function StageConfigContent({ node }) {
  if (!node) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        No node selected
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Node Info */}
      <Box>
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            letterSpacing: 0.5,
            display: 'block',
            mb: 0.5,
          }}
        >
          Node Details
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={node.id}
            size="small"
            variant="outlined"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
            }}
          />
          <Chip
            label="Stage"
            size="small"
            sx={{
              bgcolor: 'grey.100',
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}
          />
        </Stack>
      </Box>

      {/* Stage Content (reuse existing component) */}
      <Box
        sx={{
          mx: -2.5,
          px: 2.5,
          py: 2,
          bgcolor: 'background.neutral',
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <StageNodeContent
          stageGoal={node.data.stageGoal}
          knowledge={node.data.knowledge}
          dataGoals={node.data.dataGoals}
          actions={node.data.actions}
        />
      </Box>

      {/* Future: Edit buttons */}
      {/* <Box>
        <Button variant="outlined" fullWidth>
          Edit Configuration
        </Button>
      </Box> */}
    </Stack>
  );
}

StageConfigContent.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    data: PropTypes.shape({
      stageGoal: PropTypes.string,
      knowledge: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          necessity: PropTypes.string,
        })
      ),
      dataGoals: PropTypes.arrayOf(
        PropTypes.shape({
          field: PropTypes.string,
          necessity: PropTypes.string,
        })
      ),
      actions: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          necessity: PropTypes.string,
        })
      ),
    }),
  }),
};
