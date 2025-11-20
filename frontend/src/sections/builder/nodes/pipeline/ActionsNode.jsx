import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

import { PIPELINE_NODE_CONFIG } from '../../utils/node-styles';
import { BaseNode } from '../BaseNode';

/**
 * Actions Pipeline Node
 * Shows available tools/actions that the agent can execute (read-only visualization)
 */
export function ActionsNode({ data }) {
  const actionsCount = data?.actionsCount || 0;

  return (
    <BaseNode
      id={data.id}
      type="pipeline"
      pipelineType="actions"
      icon="mdi:lightning-bolt"
      title="Ações"
      tooltip="Ferramentas e ações que o agente pode executar"
      editable={false}
      iconSize={PIPELINE_NODE_CONFIG.iconSize}
      iconColor={PIPELINE_NODE_CONFIG.iconColor}
      rightHandle
    >
      <Typography variant="caption" color="text.secondary">
        {actionsCount} {actionsCount === 1 ? 'ação' : 'ações'} disponíveis
      </Typography>
    </BaseNode>
  );
}

ActionsNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    actionsCount: PropTypes.number,
  }).isRequired,
};
