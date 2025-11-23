import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { BaseNode } from '../BaseNode';

/**
 * Handoffs Configuration Node
 * Shows escalation triggers with alert badges
 */
export function HandoffsNode({ data }) {
  const config = data?.config || {};
  const triggers = config.triggers || [];
  const onEdit = data?.onEdit || (() => {});

  // Trigger type to icon and color mapping
  const triggerStyles = {
    angry: { icon: 'mdi:alert-circle', color: 'error' },
    urgent: { icon: 'mdi:clock-alert', color: 'warning' },
    complex: { icon: 'mdi:brain', color: 'info' },
    complaint: { icon: 'mdi:message-alert', color: 'error' },
    default: { icon: 'mdi:hand-back-right', color: 'primary' },
  };

  return (
    <BaseNode
      id={data.id}
      type="handoffs"
      pipelineType="validation"
      title="Escalações"
      tooltip="Quando passar para humano"
      badge={triggers.length}
      editable
      onEdit={onEdit}
      targetHandle={false}
      sourceHandle={false}
      leftHandle
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Gatilhos de escalação
      </Typography>

      {triggers.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          Sem escalações configuradas
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {triggers.slice(0, 3).map((trigger, index) => {
            const style = triggerStyles[trigger.type] || triggerStyles.default;
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 0.75,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Iconify
                  icon={style.icon}
                  width={16}
                  sx={{ color: 'text.secondary', flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', display: 'block' }}>
                    {trigger.condition || trigger.type}
                  </Typography>
                  {trigger.action && (
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                      {trigger.action}
                    </Typography>
                  )}
                </Box>
                {trigger.urgent && (
                  <Chip
                    label="!"
                    size="small"
                    sx={{
                      height: 16,
                      width: 16,
                      fontSize: '0.6rem',
                      bgcolor: 'error.main',
                      color: 'white',
                      '& .MuiChip-label': { px: 0 },
                    }}
                  />
                )}
              </Box>
            );
          })}
          {triggers.length > 3 && (
            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontSize: '0.7rem' }}>
              +{triggers.length - 3} mais
            </Typography>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

HandoffsNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    config: PropTypes.shape({
      triggers: PropTypes.arrayOf(
        PropTypes.shape({
          type: PropTypes.string,
          condition: PropTypes.string,
          action: PropTypes.string,
          urgent: PropTypes.bool,
        })
      ),
    }),
    onEdit: PropTypes.func,
  }).isRequired,
};
