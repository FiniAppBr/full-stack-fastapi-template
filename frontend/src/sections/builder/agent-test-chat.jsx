import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import axios from 'src/utils/axios';
import { useMockedUser } from 'src/auth/hooks';
import { BuilderChatInput } from './builder-chat-input';
import { BuilderChatMessages } from './builder-chat-messages';

// ----------------------------------------------------------------------

export function AgentTestChat() {
  const { user } = useMockedUser();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

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
        // Call the actual API
        const response = await axios.post('/api/v1/agent/message', {
          customer_id: `${user?.id}`,
          message: messageBody,
          agent_id: '4',
        });

        // Add AI response
        const aiMessage = {
          id: `ai-${Date.now()}`,
          body: response.data.response,
          contentType: 'text',
          createdAt: new Date().toISOString(),
          senderId: 'test-agent',
          metadata: {
            intent: response.data.intent,
            confidence: response.data.confidence,
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
    [user?.id]
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
