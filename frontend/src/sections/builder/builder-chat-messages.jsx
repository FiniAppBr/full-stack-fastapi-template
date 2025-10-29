import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { Lightbox, useLightBox } from 'src/components/lightbox';

import { ChatMessageItem } from '../chat/chat-message-item';
import { useMessagesScroll } from '../chat/hooks/use-messages-scroll';
import { ProgressiveMessage } from './progressive-message';

// ----------------------------------------------------------------------

const STARTER_PROMPTS_BUILDER = [
  {
    icon: 'solar:book-bold',
    label: 'Add knowledge',
    prompt: 'I want to add information about my business',
  },
  {
    icon: 'carbon:user-avatar',
    label: 'Set personality',
    prompt: 'Help me configure how my agent should communicate',
  },
  {
    icon: 'carbon:calendar',
    label: 'Add actions',
    prompt: 'I want my agent to handle bookings and appointments',
  },
];

const STARTER_PROMPTS_TEST = [
  {
    icon: 'solar:question-circle-bold',
    label: 'General question',
    prompt: 'Quanto custa o banho?',
  },
  {
    icon: 'carbon:calendar',
    label: 'Make a booking',
    prompt: 'Quero marcar para amanhã às 14h',
  },
  {
    icon: 'solar:clock-circle-bold',
    label: 'Business hours',
    prompt: 'Que horas vocês abrem?',
  },
];

// ----------------------------------------------------------------------

export function BuilderChatMessages({
  messages = [],
  participants,
  isTyping,
  onStarterPromptClick,
  onConfigureBlock,
  onConfirmAction,
  isTestMode = false,
}) {
  const { messagesEndRef } = useMessagesScroll(messages);

  const slides = messages
    .filter((message) => message.contentType === 'image')
    .map((message) => ({ src: message.body }));

  const lightbox = useLightBox(slides);

  // Memoize grouping logic to prevent recalculation on every render
  const messageGrouping = useMemo(() => {
    return messages.map((message, index) => {
      if (index === 0) return true;
      return message.senderId !== messages[index - 1].senderId;
    });
  }, [messages]);

  const starterPrompts = isTestMode ? STARTER_PROMPTS_TEST : STARTER_PROMPTS_BUILDER;
  const emptyStateConfig = isTestMode
    ? {
        icon: 'solar:chat-round-bold',
        title: 'Test Your Agent',
        description: 'Try out your AI agent by asking questions or making requests. See how it responds based on your configuration.',
      }
    : {
        icon: 'solar:smart-speaker-minimalistic-bold',
        title: 'Build Your AI Agent',
        description: 'Tell me about your business and I\'ll help you create a custom AI agent with knowledge, personality, and actions.',
      };

  const renderEmptyState = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        height: '100%',
        px: 3,
      }}
    >
      <Iconify icon={emptyStateConfig.icon} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 1 }}>
        {emptyStateConfig.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center', maxWidth: 400 }}>
        {emptyStateConfig.description}
      </Typography>

      <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 500 }}>
        {starterPrompts.map((starter) => (
          <Box
            key={starter.label}
            onClick={() => onStarterPromptClick(starter.prompt)}
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderRadius: 1.5,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              transition: (theme) => theme.transitions.create(['background-color', 'border-color']),
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'primary.main',
              },
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: 'primary.lighter',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Iconify icon={starter.icon} width={24} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {starter.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );

  return (
    <>
      <Scrollbar ref={messagesEndRef} sx={{ px: 3, pt: 5, pb: 3, flex: '1 1 auto' }}>
        {messages.length === 0 && !isTyping ? (
          renderEmptyState
        ) : (
          <>
            {messages.map((message, index) => {
              // Render progressive message if this is the progressive placeholder
              if (message.contentType === 'progressive' && message.progressData) {
                return (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    participants={participants}
                    firstInGroup={messageGrouping[index]}
                    customContent={
                      <ProgressiveMessage
                        fileName={message.progressData.fileName}
                        stage={message.progressData.stage}
                        progress={message.progressData.progress}
                        blockName={message.progressData.blockName}
                        onConfigure={() => onConfigureBlock(message.progressData.blockId)}
                      />
                    }
                  />
                );
              }

              // Render confirmation message with action button
              if (message.contentType === 'confirmation' && message.confirmData) {
                return (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    participants={participants}
                    firstInGroup={messageGrouping[index]}
                    customContent={
                      <Box>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
                          {message.body}
                        </Typography>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<Iconify icon="solar:magic-stick-3-bold" />}
                          onClick={() => onConfirmAction(message.confirmData.blockId, message.confirmData.blockName)}
                          sx={{ borderRadius: 1.5 }}
                        >
                          Generate Knowledge Base
                        </Button>
                      </Box>
                    }
                  />
                );
              }

              // Regular message rendering
              return (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  participants={participants}
                  onOpenLightbox={() => lightbox.onOpen(message.body)}
                  firstInGroup={messageGrouping[index]}
                />
              );
            })}
            {isTyping && (
              <ChatMessageItem
                message={{
                  id: 'typing',
                  body: '',
                  contentType: 'text',
                  createdAt: new Date().toISOString(),
                  senderId: 'builder-ai',
                }}
                participants={participants}
                isTyping
                firstInGroup={messages.length === 0 || messages[messages.length - 1].senderId !== 'builder-ai'}
              />
            )}
          </>
        )}
      </Scrollbar>

      <Lightbox
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        index={lightbox.selected}
      />
    </>
  );
}
