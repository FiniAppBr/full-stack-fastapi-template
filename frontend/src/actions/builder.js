import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

/**
 * Get blocks for an agent
 * @param {string} agentId - Agent ID
 */
export function useGetBlocks(agentId) {
  const url = agentId ? `${endpoints.builder.blocks}?agent_id=${agentId}` : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  const memoizedValue = useMemo(
    () => ({
      blocks: data?.blocks || [],
      blocksLoading: isLoading,
      blocksError: error,
      blocksEmpty: !isLoading && !data?.blocks?.length,
      refreshBlocks: mutate,
    }),
    [data, error, isLoading, mutate]
  );

  return memoizedValue;
}

/**
 * Get Builder AI conversation messages
 * @param {string} agentId - Agent ID
 */
export function useGetMessages(agentId) {
  const url = agentId ? `${endpoints.builder.messages}?agent_id=${agentId}` : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  const memoizedValue = useMemo(
    () => ({
      messages: data?.messages || [],
      messagesLoading: isLoading,
      messagesError: error,
      refreshMessages: mutate,
    }),
    [data, error, isLoading, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------
// Note: For v0.1, we're using local state in the component
// These hooks will be used in v0.2 when we integrate with the backend
