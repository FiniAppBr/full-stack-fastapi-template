import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Section, KV } from '../components/shared';

// ----------------------------------------------------------------------

export function HistoryPanel({ state }) {
  if (!state || !state.history || state.history.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">Send a message to see conversation history</Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          This shows the messages sent to the LLM (limited by history_turns setting)
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Section title={`Conversation History (${state.history.length} messages)`}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          These are the messages included in the LLM context
        </Typography>
      </Section>
      {state.history.map((msg, idx) => (
        <Box
          key={idx}
          sx={{
            p: 1,
            bgcolor: msg.role === 'user' ? 'primary.lighter' : msg.role === 'assistant' ? 'grey.100' : 'warning.lighter',
            borderRadius: 1,
            borderLeft: 3,
            borderColor: msg.role === 'user' ? 'primary.main' : msg.role === 'assistant' ? 'grey.400' : 'warning.main',
          }}
        >
          <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: 9 }}>
            {msg.role}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 11, whiteSpace: 'pre-wrap', mt: 0.5 }}>
            {msg.content}
          </Typography>
        </Box>
      ))}
      <Section title="State Info">
        <KV label="Turn count" value={state.turn_count} />
        <KV label="Thread ID" value={state.thread_id} />
        <KV label="Agent ID" value={state.agent_id} />
        {state.collected_data && Object.keys(state.collected_data).length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
              Collected Data:
            </Typography>
            {Object.entries(state.collected_data).map(([key, value]) => (
              <KV key={key} label={key} value={JSON.stringify(value)} />
            ))}
          </>
        )}
      </Section>
    </Stack>
  );
}
