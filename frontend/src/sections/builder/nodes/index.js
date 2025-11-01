/**
 * Node Types Registry
 * Export all custom node components for React Flow
 */

// Base node component
export { BaseNode } from './BaseNode';
export { FilesNode } from './config/FilesNode';
export { StyleNode } from './config/StyleNode';
// Configuration nodes (editable)
export { FilterNode } from './config/FilterNode';
export { TrackingNode } from './pipeline/TrackingNode';

export { KnowledgeNode } from './pipeline/KnowledgeNode';
export { ValidationNode } from './pipeline/ValidationNode';
export { CorrectionsNode } from './config/CorrectionsNode';
export { PersonalityNode } from './pipeline/PersonalityNode';
export { DataTrackingNode } from './config/DataTrackingNode';

// Pipeline nodes (read-only spine)
export { CommunicationNode } from './pipeline/CommunicationNode';
