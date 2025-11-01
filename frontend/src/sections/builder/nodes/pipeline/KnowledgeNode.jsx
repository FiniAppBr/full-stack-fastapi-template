import PropTypes from 'prop-types';

import Typography from '@mui/material/Typography';

import { BaseNode } from '../BaseNode';

/**
 * Knowledge Search Pipeline Node
 * Shows RAG retrieval stats (read-only visualization)
 */
export function KnowledgeNode({ data }) {
  const blockCount = data?.blockCount || 0;

  return (
    <BaseNode
      id={data.id}
      type="pipeline"
      icon="mdi:brain"
      title="Conhecimento"
      tooltip="Base de conhecimento + memórias anteriores"
      editable={false}
      iconSize={40}
      iconColor="text.secondary"
      rightHandle
    >
      <Typography variant="caption" color="text.secondary">
        {blockCount} {blockCount === 1 ? 'bloco' : 'blocos'}
      </Typography>
    </BaseNode>
  );
}

KnowledgeNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    blockCount: PropTypes.number,
  }).isRequired,
};
