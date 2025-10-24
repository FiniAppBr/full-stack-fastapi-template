// Initial nodes for demo flowchart
export const initialNodes = [
  {
    id: 'agent-1',
    type: 'agent',
    data: {
      label: 'Customer Support AI',
      model: 'GPT-4',
      personality: 'Friendly, helpful, and professional',
      knowledgeCount: 3,
      responseStyle: 'Concise with empathy',
    },
    position: { x: 300, y: 50 },
  },
  {
    id: 'stage-1',
    type: 'stage',
    data: {
      label: 'Initial Greeting',
      icon: '👋',
      description: 'Welcome the customer and identify their need',
      stageGoal: 'Understand customer inquiry type',
      expanded: false,
      knowledge: [
        { id: 1, name: 'Company greeting guidelines', necessity: 'critical' },
        { id: 2, name: 'Business hours', necessity: 'important' },
      ],
      dataGoals: [
        { id: 1, field: 'inquiry_type', necessity: 'critical' },
        { id: 2, field: 'customer_name', necessity: 'nice-to-have' },
      ],
      actions: [],
    },
    position: { x: 280, y: 250 },
  },
  {
    id: 'stage-2',
    type: 'stage',
    data: {
      label: 'Order Support',
      icon: '📦',
      description: 'Help customers with order-related questions',
      stageGoal: 'Resolve order issues or provide order information',
      expanded: false,
      knowledge: [
        { id: 1, name: 'Order policies', necessity: 'critical' },
        { id: 2, name: 'Refund process', necessity: 'critical' },
        { id: 3, name: 'Shipping information', necessity: 'important' },
      ],
      dataGoals: [
        { id: 1, field: 'order_number', necessity: 'critical' },
        { id: 2, field: 'issue_description', necessity: 'important' },
      ],
      actions: [
        { id: 1, name: 'Look up order status', necessity: 'important' },
        { id: 2, name: 'Process refund', necessity: 'important' },
      ],
    },
    position: { x: 80, y: 450 },
  },
  {
    id: 'stage-3',
    type: 'stage',
    data: {
      label: 'Product Questions',
      icon: '❓',
      description: 'Answer questions about products and services',
      stageGoal: 'Provide accurate product information',
      expanded: false,
      knowledge: [
        { id: 1, name: 'Product catalog', necessity: 'critical' },
        { id: 2, name: 'Product specifications', necessity: 'important' },
        { id: 3, name: 'Pricing information', necessity: 'important' },
      ],
      dataGoals: [
        { id: 1, field: 'product_interest', necessity: 'important' },
      ],
      actions: [],
    },
    position: { x: 480, y: 450 },
  },
  {
    id: 'end-success',
    type: 'successEnd',
    data: {
      label: 'Issue Resolved',
      endType: 'success',
    },
    position: { x: 150, y: 650 },
  },
  {
    id: 'end-escalated',
    type: 'escalatedEnd',
    data: {
      label: 'Escalated to Human',
      endType: 'escalated',
    },
    position: { x: 450, y: 650 },
  },
];

// Initial edges for demo flowchart
export const initialEdges = [
  {
    id: 'e-agent-stage1',
    source: 'agent-1',
    target: 'stage-1',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#1976d2', strokeWidth: 2 },
  },
  {
    id: 'e-stage1-stage2',
    source: 'stage-1',
    target: 'stage-2',
    label: 'Order inquiry',
    type: 'smoothstep',
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  },
  {
    id: 'e-stage1-stage3',
    source: 'stage-1',
    target: 'stage-3',
    label: 'Product inquiry',
    type: 'smoothstep',
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  },
  {
    id: 'e-stage2-success',
    source: 'stage-2',
    target: 'end-success',
    label: 'Resolved',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
  },
  {
    id: 'e-stage2-escalated',
    source: 'stage-2',
    target: 'end-escalated',
    label: 'Complex issue',
    type: 'smoothstep',
    style: { stroke: '#f59e0b', strokeWidth: 2 },
  },
  {
    id: 'e-stage3-success',
    source: 'stage-3',
    target: 'end-success',
    label: 'Answered',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
  },
  {
    id: 'e-stage3-escalated',
    source: 'stage-3',
    target: 'end-escalated',
    label: 'Needs expert',
    type: 'smoothstep',
    style: { stroke: '#f59e0b', strokeWidth: 2 },
  },
];
