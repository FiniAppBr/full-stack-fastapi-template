import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

function ContentSection({ icon, iconColor, title, items, renderItem }) {
  if (!items || items.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Iconify icon={icon} width={16} sx={{ color: iconColor }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: 'text.secondary',
          }}
        >
          {title}
        </Typography>
      </Stack>

      <Stack spacing={1}>
        {items.map((item, index) => (
          <Box key={index}>{renderItem(item)}</Box>
        ))}
      </Stack>
    </Box>
  );
}

ContentSection.propTypes = {
  icon: PropTypes.string.isRequired,
  iconColor: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({})),
  renderItem: PropTypes.func.isRequired,
};

// ----------------------------------------------------------------------

function getNecessityColor(necessity) {
  switch (necessity) {
    case 'critical':
      return 'error.main';
    case 'important':
      return 'warning.main';
    case 'nice-to-have':
      return 'success.main';
    default:
      return 'text.secondary';
  }
}

function getNecessityLabel(necessity) {
  switch (necessity) {
    case 'critical':
      return 'Critical';
    case 'important':
      return 'Important';
    case 'nice-to-have':
      return 'Nice to have';
    default:
      return necessity;
  }
}

// ----------------------------------------------------------------------

export function StageNodeContent({ stageGoal, knowledge, dataGoals, actions }) {
  return (
    <Box sx={{ px: 2.5, pb: 2.5 }}>
      {/* Stage Goal */}
      {stageGoal && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: 'text.secondary',
              display: 'block',
              mb: 1,
            }}
          >
            Goal
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.primary',
              fontStyle: 'italic',
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              borderLeft: (theme) => `3px solid ${theme.palette.primary.main}`,
            }}
          >
            {stageGoal}
          </Typography>
        </Box>
      )}

      {/* Divider */}
      {stageGoal && (knowledge || dataGoals || actions) && <Divider sx={{ my: 2 }} />}

      {/* Knowledge Section */}
      <ContentSection
        icon="solar:book-bold"
        iconColor="primary.main"
        title="Knowledge Base"
        items={knowledge}
        renderItem={(item) => (
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: getNecessityColor(item.necessity),
                mt: 0.75,
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                {item.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: getNecessityColor(item.necessity),
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              >
                {getNecessityLabel(item.necessity)}
              </Typography>
            </Box>
          </Stack>
        )}
      />

      {/* Data Goals Section */}
      <ContentSection
        icon="solar:checklist-bold"
        iconColor="success.main"
        title="Data Collection"
        items={dataGoals}
        renderItem={(item) => (
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: getNecessityColor(item.necessity),
                mt: 0.75,
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {item.field}
                </Box>
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: getNecessityColor(item.necessity),
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              >
                {getNecessityLabel(item.necessity)}
              </Typography>
            </Box>
          </Stack>
        )}
      />

      {/* Actions Section */}
      <ContentSection
        icon="solar:lightning-bold"
        iconColor="warning.main"
        title="Available Actions"
        items={actions}
        renderItem={(item) => (
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: getNecessityColor(item.necessity),
                mt: 0.75,
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                {item.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: getNecessityColor(item.necessity),
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              >
                {getNecessityLabel(item.necessity)}
              </Typography>
            </Box>
          </Stack>
        )}
      />
    </Box>
  );
}

StageNodeContent.propTypes = {
  stageGoal: PropTypes.string,
  knowledge: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      necessity: PropTypes.oneOf(['critical', 'important', 'nice-to-have']),
    })
  ),
  dataGoals: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      necessity: PropTypes.oneOf(['critical', 'important', 'nice-to-have']),
    })
  ),
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      necessity: PropTypes.oneOf(['critical', 'important', 'nice-to-have']),
    })
  ),
};
