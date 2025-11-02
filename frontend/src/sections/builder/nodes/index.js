/**
 * Node Types Registry
 * Export all custom node components for React Flow
 */

// Base node component
export { BaseNode } from './BaseNode';

// Configuration nodes (editable)
export { FilterNode } from './config/FilterNode';
export { FieldsNode } from './config/FieldsNode';
export { ToneNode } from './config/ToneNode';
export { StyleNode } from './config/StyleNode';
export { ToolsNode } from './config/ToolsNode';
export { CorrectionsNode } from './config/CorrectionsNode';
export { HandoffsNode } from './config/HandoffsNode';
export { KnowledgeVisualizationNode } from './config/KnowledgeVisualizationNode';

// Legacy nodes (will be removed)
export { FilesNode } from './config/FilesNode';
export { DataTrackingNode } from './config/DataTrackingNode';

// Pipeline nodes (read-only spine)
export { TrackingNode } from './pipeline/TrackingNode';
export { KnowledgeNode } from './pipeline/KnowledgeNode';
export { ValidationNode } from './pipeline/ValidationNode';
export { PersonalityNode } from './pipeline/PersonalityNode';

// Pipeline nodes (read-only spine)
export { CommunicationNode } from './pipeline/CommunicationNode';
export { ActionsNode } from './pipeline/ActionsNode';

// Action nodes
export { AddNode } from './AddNode';
