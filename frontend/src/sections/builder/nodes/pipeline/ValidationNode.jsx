import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

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
      icon="tabler:circle-check"
      title="Validação"
      tooltip="Correções automáticas antes de enviar"
      editable={false}
      iconSize={40}
      iconColor="text.secondary"
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
