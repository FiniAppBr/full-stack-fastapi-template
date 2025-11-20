import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

import { PIPELINE_NODE_CONFIG } from '../../utils/node-styles';
import { BaseNode } from '../BaseNode';

/**
 * Validation Pipeline Node
 * Shows response validation stats (read-only visualization)
 */
export function ValidationNode({ data }) {
  const rulesCount = data?.rulesCount || 0;

  return (
    <BaseNode
      id={data.id}
      type="pipeline"
      pipelineType="validation"
      icon="lucide:shield-check"
      title="Validação"
      tooltip="Correções automáticas antes de enviar"
      editable={false}
      iconSize={PIPELINE_NODE_CONFIG.iconSize}
      iconColor={PIPELINE_NODE_CONFIG.iconColor}
      rightHandle
    >
      <Typography variant="caption" color="text.secondary">
        {rulesCount} {rulesCount === 1 ? 'regra' : 'regras'}
      </Typography>
    </BaseNode>
  );
}

ValidationNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    rulesCount: PropTypes.number,
  }).isRequired,
};
