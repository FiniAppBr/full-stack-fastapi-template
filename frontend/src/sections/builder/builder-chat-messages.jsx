import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { Lightbox, useLightBox } from 'src/components/lightbox';

import { ChatMessageItem } from '../chat/chat-message-item';
import { useMessagesScroll } from '../chat/hooks/use-messages-scroll';

// ----------------------------------------------------------------------

const STARTER_PROMPTS = [
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

// ----------------------------------------------------------------------

export function BuilderChatMessages({ messages = [], participants, isTyping, onStarterPromptClick }) {
  const { messagesEndRef } = useMessagesScroll(messages);

  const slides = messages
    .filter((message) => message.contentType === 'image')
    .map((message) => ({ src: message.body }));

  const lightbox = useLightBox(slides);

  // Determine if message is first in group (different sender than previous)
  const isFirstInGroup = (index) => {
    if (index === 0) return true;
    return messages[index].senderId !== messages[index - 1].senderId;
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
      <Iconify icon="solar:smart-speaker-minimalistic-bold" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 1 }}>
        Build Your AI Agent
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center', maxWidth: 400 }}>
        Tell me about your business and I'll help you create a custom AI agent with knowledge, personality, and actions.
      </Typography>

      <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 500 }}>
        {STARTER_PROMPTS.map((starter) => (
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
            {messages.map((message, index) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                participants={participants}
                onOpenLightbox={() => lightbox.onOpen(message.body)}
                firstInGroup={isFirstInGroup(index)}
              />
            ))}
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
                firstInGroup
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
