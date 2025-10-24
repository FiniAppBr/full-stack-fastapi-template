import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

import { Iconify } from 'src/components/iconify';

import { nodeStyles } from 'src/sections/agent/flowchart/node-styles';

// ----------------------------------------------------------------------

export function StageNodeSummary({ knowledge, dataGoals, actions }) {
  const hasContent =
    (knowledge && knowledge.length > 0) ||
    (dataGoals && dataGoals.length > 0) ||
    (actions && actions.length > 0);

  if (!hasContent) return null;

  return (
    <Box sx={{ px: 2.5, pb: 2 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {knowledge && knowledge.length > 0 && (
          <Chip
            size="small"
            icon={<Iconify icon="solar:book-bold" width={nodeStyles.iconSize.summary} />}
            label={`${knowledge.length} Knowledge`}
            variant="outlined"
            sx={{
              height: 24,
              fontSize: '0.75rem',
              fontWeight: 500,
              borderColor: 'divider',
              color: 'text.secondary',
              '& .MuiChip-icon': {
                color: 'primary.main',
                marginLeft: 1,
              },
            }}
          />
        )}

        {dataGoals && dataGoals.length > 0 && (
          <Chip
            size="small"
            icon={<Iconify icon="solar:checklist-bold" width={nodeStyles.iconSize.summary} />}
            label={`${dataGoals.length} Data Goals`}
            variant="outlined"
            sx={{
              height: 24,
              fontSize: '0.75rem',
              fontWeight: 500,
              borderColor: 'divider',
              color: 'text.secondary',
              '& .MuiChip-icon': {
                color: 'success.main',
                marginLeft: 1,
              },
            }}
          />
        )}

        {actions && actions.length > 0 && (
          <Chip
            size="small"
            icon={<Iconify icon="solar:lightning-bold" width={nodeStyles.iconSize.summary} />}
            label={`${actions.length} Actions`}
            variant="outlined"
            sx={{
              height: 24,
              fontSize: '0.75rem',
              fontWeight: 500,
              borderColor: 'divider',
              color: 'text.secondary',
              '& .MuiChip-icon': {
                color: 'warning.main',
                marginLeft: 1,
              },
            }}
          />
        )}
      </Stack>
    </Box>
  );
}

StageNodeSummary.propTypes = {
  knowledge: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      necessity: PropTypes.string,
    })
  ),
  dataGoals: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      field: PropTypes.string,
      necessity: PropTypes.string,
    })
  ),
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      necessity: PropTypes.string,
    })
  ),
};
