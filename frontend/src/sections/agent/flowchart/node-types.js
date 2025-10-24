import { memo } from 'react';

import AgentNode from 'src/nodes/AgentNode';
import StageNode from 'src/nodes/StageNode';
import SuccessEndNode from 'src/nodes/SuccessEndNode';
import EscalatedEndNode from 'src/nodes/EscalatedEndNode';

// ----------------------------------------------------------------------

export const nodeTypes = {
  agent: memo(AgentNode),
  stage: memo(StageNode),
  successEnd: memo(SuccessEndNode),
  escalatedEnd: memo(EscalatedEndNode),
};
