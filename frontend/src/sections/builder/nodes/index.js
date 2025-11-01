/**
 * Node Types Registry
 * Export all custom node components for React Flow
 */

// Pipeline nodes (read-only spine)
export { CommunicationNode } from './pipeline/CommunicationNode';
export { KnowledgeNode } from './pipeline/KnowledgeNode';
export { TrackingNode } from './pipeline/TrackingNode';
export { ValidationNode } from './pipeline/ValidationNode';
export { PersonalityNode } from './pipeline/PersonalityNode';

// Configuration nodes (editable)
export { FilterNode } from './config/FilterNode';
export { DataTrackingNode } from './config/DataTrackingNode';
export { CorrectionsNode } from './config/CorrectionsNode';
export { FilesNode } from './config/FilesNode';
export { StyleNode } from './config/StyleNode';

// Base node component
export { BaseNode } from './BaseNode';
