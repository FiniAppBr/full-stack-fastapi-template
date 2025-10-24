import { useState, useCallback } from 'react';
import { useUpdateNodeInternals } from 'reactflow';

/**
 * Custom hook for managing node expansion state with smooth animations
 *
 * Uses MUI Collapse's onEntered/onExited callbacks to coordinate with React Flow.
 * This is cleaner than setTimeout and ensures we only update after animations complete.
 *
 * @param {string} nodeId - The React Flow node ID
 * @param {boolean} initialExpanded - Initial expansion state from node data
 * @returns {Object} - { expanded, toggleExpand, handleCollapseComplete }
 */
export function useNodeExpansion(nodeId, initialExpanded = false) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const updateNodeInternals = useUpdateNodeInternals();

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Called by MUI Collapse's onEntered/onExited callbacks
  // This ensures React Flow updates handles AFTER animation completes
  const handleCollapseComplete = useCallback(() => {
    updateNodeInternals(nodeId);
  }, [nodeId, updateNodeInternals]);

  return {
    expanded,
    toggleExpand,
    handleCollapseComplete,
  };
}
