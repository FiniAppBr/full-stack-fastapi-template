import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher } from 'src/utils/axios';

// ----------------------------------------------------------------------

export function useGetNinaLogs() {
  const { data, error, isLoading, mutate } = useSWR('/api/v1/nina/logs', fetcher);

  const memoizedValue = useMemo(
    () => ({
      logs: data?.logs || [],
      logsLoading: isLoading,
      logsError: error,
      logsEmpty: !isLoading && !data?.logs?.length,
      mutate,
    }),
    [data, error, isLoading, mutate]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetNinaConversation(threadId) {
  const url = threadId ? `/api/v1/nina/logs/${threadId}` : null;

  const { data, error, isLoading } = useSWR(url, fetcher);

  const memoizedValue = useMemo(
    () => ({
      conversation: data || null,
      turns: data?.turns || [],
      conversationLoading: isLoading,
      conversationError: error,
    }),
    [data, error, isLoading]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

// Cost calculation helpers
// Prices from OpenRouter (USD per million tokens)
const PRICING = {
  'gemini-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    input: 0.10,  // $0.10/M input
    output: 0.40, // $0.40/M output
  },
  'mistral-nemo': {
    name: 'Mistral Nemo',
    input: 0.02,  // $0.02/M input
    output: 0.04, // $0.04/M output
  },
};

const USD_TO_BRL = 5.8;

export function calculateConversationCost(turns) {
  // Estimate tokens per turn based on real data:
  // Gemini: ~1500-2000 input, ~50-100 output per turn
  // Mistral: ~1300-1500 input, ~100-115 output per turn

  const numTurns = turns?.length || 0;

  // Average from real data
  const geminiInputPerTurn = 1600;
  const geminiOutputPerTurn = 60;
  const mistralInputPerTurn = 1400;
  const mistralOutputPerTurn = 105;

  const geminiCost = numTurns * (
    (geminiInputPerTurn * PRICING['gemini-flash-lite'].input / 1_000_000) +
    (geminiOutputPerTurn * PRICING['gemini-flash-lite'].output / 1_000_000)
  );

  const mistralCost = numTurns * (
    (mistralInputPerTurn * PRICING['mistral-nemo'].input / 1_000_000) +
    (mistralOutputPerTurn * PRICING['mistral-nemo'].output / 1_000_000)
  );

  const totalUSD = geminiCost + mistralCost;
  const totalBRL = totalUSD * USD_TO_BRL;

  return {
    turns: numTurns,
    totalTokens: numTurns * (geminiInputPerTurn + geminiOutputPerTurn + mistralInputPerTurn + mistralOutputPerTurn),
    gemini: {
      tokens: numTurns * (geminiInputPerTurn + geminiOutputPerTurn),
      costUSD: geminiCost,
      costBRL: geminiCost * USD_TO_BRL,
    },
    mistral: {
      tokens: numTurns * (mistralInputPerTurn + mistralOutputPerTurn),
      costUSD: mistralCost,
      costBRL: mistralCost * USD_TO_BRL,
    },
    totalUSD,
    totalBRL,
  };
}
