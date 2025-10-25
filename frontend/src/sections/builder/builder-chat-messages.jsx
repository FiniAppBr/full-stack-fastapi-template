import { Scrollbar } from 'src/components/scrollbar';
import { Lightbox, useLightBox } from 'src/components/lightbox';

import { ChatMessageItem } from '../chat/chat-message-item';
import { useMessagesScroll } from '../chat/hooks/use-messages-scroll';

// ----------------------------------------------------------------------

export function BuilderChatMessages({ messages = [], participants, isTyping }) {
  const { messagesEndRef } = useMessagesScroll(messages);

  const slides = messages
    .filter((message) => message.contentType === 'image')
    .map((message) => ({ src: message.body }));

  const lightbox = useLightBox(slides);

  return (
    <>
      <Scrollbar ref={messagesEndRef} sx={{ px: 3, pt: 5, pb: 3, flex: '1 1 auto' }}>
        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            participants={participants}
            onOpenLightbox={() => lightbox.onOpen(message.body)}
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
          />
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
