import { m } from 'framer-motion';
import { memo, useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import axios from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const CHAT_ENDPOINT = '/api/v1/nina/v3/chat';

export const ChatPreview = memo(({ agentId, isDirty = false }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [threadId, setThreadId] = useState(() => `preview-${Date.now()}`);
  const messagesEndRef = useRef(null);

  const configChanged = messages.length > 0 && isDirty;

  const handleReset = useCallback(() => {
    setMessages([]);
    setThreadId(`preview-${Date.now()}`);
    setIsTyping(false);
    setLoading(false);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading || !agentId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(CHAT_ENDPOINT, {
        message: userMessage,
        thread_id: threadId,
        agent_id: agentId,
      });

      const { data } = response;
      setLoading(false);

      const msgList = data.messages?.length > 0
        ? data.messages
        : (data.response ? [{ content: data.response }] : []);

      if (msgList && msgList.length > 0) {
        let cumulativeDelay = 0;

        msgList.forEach((msg, idx) => {
          const msgText = msg.content || msg.text || String(msg);
          const typingTime = (msg.typing_delay_ms ? msg.typing_delay_ms / 1000 : null) || msg.typing_time || 0.8;

          setTimeout(() => {
            setIsTyping(true);
          }, cumulativeDelay * 1000);

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [...prev, { role: 'assistant', content: msgText }]);
          }, (cumulativeDelay + typingTime) * 1000);

          cumulativeDelay += typingTime + ((msg.pause_after_ms || 0) / 1000);
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'error', content: 'Erro ao enviar mensagem' }]);
      setLoading(false);
    }
  }, [input, loading, threadId, agentId]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: 380,
        height: 'calc(100vh - 220px)',
        maxHeight: 700,
        minHeight: 500,
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'grey.300',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'grey.200',
          bgcolor: 'grey.50',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Preview
        </Typography>
        {messages.length > 0 && (
          <IconButton
            size="small"
            onClick={handleReset}
            sx={{
              color: 'text.secondary',
              opacity: configChanged ? 0 : 1,
              transition: 'opacity 0.3s ease',
              pointerEvents: configChanged ? 'none' : 'auto',
            }}
          >
            <Iconify icon="solar:restart-bold" width={16} />
          </IconButton>
        )}
      </Stack>

      {/* Messages */}
      {messages.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.disabled',
          }}
        >
          <Iconify icon="solar:chat-dots-linear" width={48} sx={{ mb: 1, opacity: 0.5 }} />
          <Typography variant="caption">
            {agentId ? 'Envie uma mensagem para testar' : 'Salve o agente para testar'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <Scrollbar
            sx={{
              flex: 1,
              minHeight: 0,
              maxHeight: '100%',
              p: 2,
              filter: configChanged ? 'blur(3px)' : 'none',
              transition: 'filter 0.3s ease',
              '& .simplebar-scrollbar::before': { display: 'none' },
            }}
          >
            <Stack spacing={1.5}>
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <CircularProgress size={20} />
                </Box>
              )}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </Stack>
          </Scrollbar>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              bgcolor: 'rgba(255,255,255,0.7)',
              opacity: configChanged ? 1 : 0,
              transition: 'opacity 0.3s ease',
              pointerEvents: configChanged ? 'auto' : 'none',
            }}
          >
            <Typography variant="body2" color="text.secondary" textAlign="center" px={2}>
              Configurações atualizadas, recarregue o chat
            </Typography>
            <IconButton
              onClick={handleReset}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                width: 48,
                height: 48,
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <Iconify icon="solar:restart-bold" width={24} />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Input */}
      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'grey.200' }}>
        <TextField
          fullWidth
          size="small"
          placeholder={agentId ? 'Digite uma mensagem...' : 'Salve para testar'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading || !agentId}
          InputProps={{
            sx: { borderRadius: 2.5, bgcolor: 'grey.50', fontSize: '0.85rem' },
            endAdornment: (
              <IconButton
                size="small"
                onClick={handleSend}
                disabled={loading || !input.trim() || !agentId}
              >
                <Iconify icon="solar:plain-bold" width={18} sx={{ color: 'primary.main' }} />
              </IconButton>
            ),
          }}
        />
      </Box>
    </Paper>
  );
});

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
          maxWidth: '85%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: isError ? 'error.lighter' : isUser ? 'primary.main' : 'grey.200',
          color: isError ? 'error.dark' : isUser ? 'primary.contrastText' : 'text.primary',
        }}
      >
        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
          {message.content}
        </Typography>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

const dotVariants = {
  initial: { y: 0 },
  animate: { y: -4 },
};

const dotTransition = {
  duration: 0.4,
  repeat: Infinity,
  repeatType: 'reverse',
  ease: 'easeInOut',
};

function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: 'grey.200',
          display: 'flex',
          gap: 0.5,
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <m.div
            key={i}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ ...dotTransition, delay: i * 0.15 }}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: '#9e9e9e',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
