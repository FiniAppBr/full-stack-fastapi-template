import { useState, useEffect, useCallback } from 'react';

import axios, { endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

/**
 * Hook to fetch which agents are linked to a specific entity
 *
 * @param {number} entityId - The entity ID to check
 * @returns {{ linkedAgents: Array<{id: number, name: string}>, loading: boolean, refetch: () => void }}
 */
export function useEntityAgentLinks(entityId) {
  const [linkedAgents, setLinkedAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    if (!entityId) {
      setLinkedAgents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(endpoints.neoAgents.list);
      const agents = response.data?.data || [];

      // Filter agents that have this entity in their linked_entities
      const linked = agents
        .filter((agent) => {
          const linkedEntities = (agent.linked_entities || []).map((id) =>
            typeof id === 'string' ? parseInt(id, 10) : id
          );
          return linkedEntities.includes(entityId);
        })
        .map((agent) => ({ id: agent.id, name: agent.name }));

      setLinkedAgents(linked);
    } catch (error) {
      console.error('Failed to fetch agent links:', error);
      setLinkedAgents([]);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return {
    linkedAgents,
    loading,
    refetch: fetchLinks,
  };
}
