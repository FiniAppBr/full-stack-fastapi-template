import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Section, CATEGORY_COLORS } from '../components/shared';

// ----------------------------------------------------------------------

export function RAGPanel({ assembled }) {
  if (!assembled) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">Send a message to see RAG results</Typography>
      </Box>
    );
  }

  const { chunks, total_tokens, tool_context } = assembled;

  // Group chunks by category
  const byCategory = {};
  chunks?.forEach(chunk => {
    const cat = chunk.metadata?.category || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(chunk);
  });

  return (
    <Stack spacing={1.5}>
      <Section title={`Chunks (${chunks?.length || 0}) • ${total_tokens} tokens`}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {Object.entries(byCategory).map(([cat, catChunks]) => (
            <Chip key={cat} label={`${cat}: ${catChunks.length}`} size="small" color={CATEGORY_COLORS[cat] || 'default'} sx={{ height: 18, fontSize: 9 }} />
          ))}
        </Box>
      </Section>
      {chunks?.map((chunk, idx) => {
        const category = chunk.metadata?.category || 'unknown';
        return (
          <Box key={idx} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, borderLeft: 3, borderColor: `${CATEGORY_COLORS[category] || 'grey'}.main` }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>{chunk.title || 'Untitled'}</Typography>
                <Chip label={category} size="small" color={CATEGORY_COLORS[category] || 'default'} sx={{ height: 16, fontSize: 8 }} />
              </Stack>
              <Chip
                label={`${(chunk.score * 100).toFixed(0)}%`}
                size="small"
                color={chunk.score > 0.7 ? 'success' : chunk.score > 0.5 ? 'warning' : 'default'}
                sx={{ height: 18, fontSize: 10 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
              {chunk.token_count} tokens • {chunk.is_entity ? 'Entity' : 'Knowledge'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontSize: 10, color: 'text.secondary' }}>{chunk.content}</Typography>
          </Box>
        );
      })}
      {tool_context && (
        <Section title="Tool Context">
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: 10 }}>{tool_context}</Typography>
        </Section>
      )}
    </Stack>
  );
}
