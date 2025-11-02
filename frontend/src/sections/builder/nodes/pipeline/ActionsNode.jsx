import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

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
      icon="mdi:lightning-bolt"
      title="Ações"
      tooltip="Ferramentas e ações que o agente pode executar"
      editable={false}
      iconSize={40}
      iconColor="text.secondary"
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
