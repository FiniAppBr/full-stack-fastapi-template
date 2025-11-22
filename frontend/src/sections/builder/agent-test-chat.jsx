import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';

import axios from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

import { useMockedUser } from 'src/auth/hooks';

import { BuilderChatInput } from './builder-chat-input';
import { BuilderChatMessages } from './builder-chat-messages';

// Generate short UUID
function generateSessionId() {
  return `test-${Math.random().toString(36).substring(2, 10)}`;
}

// ----------------------------------------------------------------------

export function AgentTestChat() {
  const { user } = useMockedUser();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // Option 1: Generate unique customer_id per session (fresh on reload)
  const [customerId, setCustomerId] = useState(() => generateSessionId());
  const [isEditingCustomerId, setIsEditingCustomerId] = useState(false);

  // Knowledge stats
  const [knowledgeStats, setKnowledgeStats] = useState({ blocks: 0, chunks: 0 });

  // Fetch knowledge stats
  const fetchKnowledgeStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/v1/agent/knowledge-stats?agent_id=4');
      setKnowledgeStats(response.data);
    } catch (error) {
      console.error('Failed to fetch knowledge stats:', error);
    }
  }, []);

  // Fetch stats on mount and set up polling
  useEffect(() => {
    fetchKnowledgeStats();
    const interval = setInterval(fetchKnowledgeStats, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchKnowledgeStats]);

  // Mock participants for test chat
  const participants = [
    {
      id: 'test-agent',
      name: 'Assistant AI',
      avatarUrl: null,
      role: 'assistant',
    },
    {
      id: `${user?.id}`,
      name: user?.displayName || 'You',
      avatarUrl: user?.photoURL,
      role: 'user',
    },
  ];

  // Option 2: Clear conversation history
  const handleClearHistory = useCallback(async () => {
    try {
      await axios.delete(`/api/v1/agent/history?customer_id=${customerId}&agent_id=4`);
      setMessages([]);
      toast.success('Conversation history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
      toast.error('Failed to clear history');
    }
  }, [customerId]);

  // Option 4: Generate new session
  const handleNewSession = useCallback(() => {
    const newId = generateSessionId();
    setCustomerId(newId);
    setMessages([]);
    toast.success(`New session: ${newId}`);
  }, []);

  // Send message to actual API
  const handleSendMessage = useCallback(
    async (messageBody) => {
      if (!messageBody.trim()) return;

      // Add user message immediately
      const userMessage = {
        id: `user-${Date.now()}`,
        body: messageBody,
        contentType: 'text',
        createdAt: new Date().toISOString(),
        senderId: `${user?.id}`,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Show typing indicator
      setIsTyping(true);

      try {
        // Call the LangGraph chat API
        const response = await axios.post('/api/v1/agent/chat', {
          agent_id: 4,
          customer_id: customerId,
          message: messageBody,
        });

        // Add AI response
        const aiMessage = {
          id: `ai-${Date.now()}`,
          body: response.data.response,
          contentType: 'text',
          createdAt: new Date().toISOString(),
          senderId: 'test-agent',
          metadata: {
            state: response.data.state,
            tokens: response.data.tokens_used,
          },
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error('Error sending message:', error);
        // Add error message
        const errorMessage = {
          id: `error-${Date.now()}`,
          body: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
          contentType: 'text',
          createdAt: new Date().toISOString(),
          senderId: 'test-agent',
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    },
    [customerId, user?.id]
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Session controls header */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.neutral',
        }}
      >
        <TextField
          size="small"
          label="Customer ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 300 }}
          slotProps={{
            input: {
              endAdornment: (
                <Tooltip title="Copy to clipboard">
                  <IconButton
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(customerId);
                      toast.success('Copied to clipboard');
                    }}
                  >
                    <Iconify icon="eva:copy-outline" width={18} />
                  </IconButton>
                </Tooltip>
              ),
            },
          }}
        />

        <Tooltip title="Generate new session (fresh conversation)">
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="eva:refresh-outline" />}
            onClick={handleNewSession}
          >
            New Session
          </Button>
        </Tooltip>

        <Tooltip title="Clear conversation history for this customer">
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<Iconify icon="eva:trash-2-outline" />}
            onClick={handleClearHistory}
          >
            Clear History
          </Button>
        </Tooltip>

        {/* Knowledge stats */}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Tooltip title="Active knowledge blocks">
            <Chip
              icon={<Iconify icon="eva:file-text-outline" width={18} />}
              label={`${knowledgeStats.blocks} blocks`}
              size="small"
              color={knowledgeStats.blocks > 0 ? 'success' : 'default'}
            />
          </Tooltip>
          <Tooltip title="Total knowledge chunks (embeddings)">
            <Chip
              icon={<Iconify icon="eva:cube-outline" width={18} />}
              label={`${knowledgeStats.chunks} chunks`}
              size="small"
              color={knowledgeStats.chunks > 0 ? 'info' : 'default'}
            />
          </Tooltip>
        </Box>
      </Stack>

      <BuilderChatMessages
        messages={messages}
        participants={participants}
        isTyping={isTyping}
        onStarterPromptClick={handleSendMessage}
        isTestMode
      />
      <BuilderChatInput onSendMessage={handleSendMessage} disabled={false} />
    </Box>
  );
}
