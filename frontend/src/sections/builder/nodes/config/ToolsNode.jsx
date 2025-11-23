import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { BaseNode } from '../BaseNode';

/**
 * Tools Configuration Node
 * Shows available tools/actions with icon grid
 */
export function ToolsNode({ data }) {
  const config = data?.config || {};
  const tools = config.tools || [];
  const onEdit = data?.onEdit || (() => {});

  // Tool type to icon mapping
  const toolIcons = {
    calendar: 'mdi:calendar',
    payment: 'mdi:credit-card',
    send_file: 'mdi:file-send',
    api_call: 'mdi:api',
    database: 'mdi:database',
    email: 'mdi:email',
    sms: 'mdi:message',
    default: 'mdi:tools',
  };

  return (
    <BaseNode
      id={data.id}
      type="tools"
      pipelineType="actions"
      title="Ferramentas"
      tooltip="Ações que o AI pode executar"
      badge={tools.length}
      editable
      onEdit={onEdit}
      targetHandle={false}
      sourceHandle={false}
      leftHandle
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Ações disponíveis
      </Typography>

      {tools.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          Nenhuma ferramenta configurada
        </Typography>
      ) : (
        <Box>
          {/* Tool icon grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              mb: 1,
            }}
          >
            {tools.slice(0, 6).map((tool, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  aspectRatio: '1',
                }}
              >
                <Iconify
                  icon={toolIcons[tool.type] || toolIcons.default}
                  width={20}
                  sx={{ color: 'primary.main', mb: 0.5 }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.6rem', textAlign: 'center' }}>
                  {tool.name || tool.type}
                </Typography>
              </Box>
            ))}
          </Box>

          {tools.length > 6 && (
            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontSize: '0.7rem' }}>
              +{tools.length - 6} mais
            </Typography>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

ToolsNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    config: PropTypes.shape({
      tools: PropTypes.arrayOf(
        PropTypes.shape({
          type: PropTypes.string,
          name: PropTypes.string,
        })
      ),
    }),
    onEdit: PropTypes.func,
  }).isRequired,
};
