import { useState, useRef, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import CircularProgress from '@mui/material/CircularProgress';

import axios from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const NINA_ENDPOINT = '/api/v1/nina/chat';

export function NinaDebugView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(`debug-${Date.now()}`);
  const [lastState, setLastState] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(NINA_ENDPOINT, {
        message: userMessage,
        thread_id: threadId,
      });

      const data = response.data;

      // Add assistant messages
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach((msg, idx) => {
          setTimeout(() => {
            setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
          }, idx * 300);
        });
      } else if (data.response) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      }

      // Save state for display
      setLastState(data);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'error', content: `Error: ${error.message || 'Failed to send message'}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, threadId]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setLastState(null);
    setThreadId(`debug-${Date.now()}`);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', gap: 2, p: 2 }}>
      {/* Chat Panel */}
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Chat with Nina</Typography>
          <Button size="small" color="error" onClick={handleReset} startIcon={<Iconify icon="solar:restart-bold" />}>
            Reset
          </Button>
        </Stack>

        {/* Messages */}
        <Scrollbar sx={{ flex: 1, p: 2 }}>
          <Stack spacing={2}>
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <CircularProgress size={24} />
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Stack>
        </Scrollbar>

        {/* Input */}
        <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <IconButton color="primary" onClick={handleSend} disabled={loading || !input.trim()}>
            <Iconify icon="solar:plain-bold" />
          </IconButton>
        </Stack>
      </Card>

      {/* State Panel */}
      <Card sx={{ width: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          Pipeline State
        </Typography>

        <Scrollbar sx={{ flex: 1 }}>
          {lastState ? (
            <Stack sx={{ p: 1 }}>
              {/* Mode */}
              <StateAccordion title="Mode" defaultExpanded>
                <Chip label={lastState.mode} color="primary" size="small" />
                <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                  Turn {lastState.turn_count}
                </Typography>
              </StateAccordion>

              {/* Signals */}
              <StateAccordion title="Signals (this turn)" defaultExpanded>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {Object.entries(lastState.signals || {}).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value || 'null'}`}
                      size="small"
                      variant={value ? 'filled' : 'outlined'}
                      color={value ? 'info' : 'default'}
                    />
                  ))}
                </Stack>
              </StateAccordion>

              {/* Gates */}
              <StateAccordion title="Gates (permanent events)">
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {Object.entries(lastState.gates || {}).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={key}
                      size="small"
                      color={value ? 'success' : 'default'}
                      variant={value ? 'filled' : 'outlined'}
                    />
                  ))}
                </Stack>
              </StateAccordion>

              {/* Traits */}
              <StateAccordion title="Traits (user profile)">
                <Stack spacing={0.5}>
                  {Object.entries(lastState.traits || {}).map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 100 }}>
                        {key}:
                      </Typography>
                      <Typography variant="caption" color={value ? 'text.primary' : 'text.disabled'}>
                        {value || 'not set'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </StateAccordion>

              {/* Chunks */}
              <StateAccordion title={`Chunks (${lastState.chunks?.length || 0}) - ${lastState.total_chunk_tokens} tokens`}>
                <Stack spacing={1}>
                  {(lastState.chunks || []).map((chunk, idx) => (
                    <Card key={idx} variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="caption" fontWeight={600}>
                        {chunk.title || 'Untitled'}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: 10 }}>
                        Score: {chunk.score.toFixed(2)} | Rule: {chunk.source_rule} | {chunk.token_count} tokens
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                        {chunk.labels.map((label) => (
                          <Chip key={label} label={label} size="small" sx={{ height: 18, fontSize: 10 }} />
                        ))}
                      </Stack>
                      <Typography variant="caption" sx={{ mt: 1, display: 'block', fontSize: 11, color: 'text.secondary' }}>
                        {chunk.content}
                      </Typography>
                    </Card>
                  ))}
                </Stack>
              </StateAccordion>

              {/* Rules Fired */}
              <StateAccordion title="Rules Fired">
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {(lastState.rules_fired || []).map((rule) => (
                    <Chip key={rule} label={rule} size="small" color="warning" />
                  ))}
                </Stack>
              </StateAccordion>
            </Stack>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Iconify icon="solar:chat-dots-bold-duotone" width={48} sx={{ mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">Send a message to see pipeline state</Typography>
            </Box>
          )}
        </Scrollbar>
      </Card>
    </Box>
  );
}

// ----------------------------------------------------------------------

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <Box
        sx={{
          maxWidth: '80%',
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: isError ? 'error.lighter' : isUser ? 'primary.main' : 'grey.200',
          color: isError ? 'error.dark' : isUser ? 'primary.contrastText' : 'text.primary',
        }}
      >
        <Typography variant="body2">{message.content}</Typography>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

function StateAccordion({ title, children, defaultExpanded = false }) {
  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters sx={{ '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<Iconify icon="solar:alt-arrow-down-bold" />}>
        <Typography variant="subtitle2">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
