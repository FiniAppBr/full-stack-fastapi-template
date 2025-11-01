import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { useMockedUser } from 'src/auth/hooks';

import { useMessage } from './hooks/use-message';

// ----------------------------------------------------------------------

const dotVariants = {
  initial: { y: 0 },
  animate: { y: -8 },
};

const dotTransition = {
  duration: 0.5,
  repeat: Infinity,
  repeatType: 'reverse',
  ease: 'easeInOut',
};

// ----------------------------------------------------------------------

export function ChatMessageItem({ message, participants, onOpenLightbox, isTyping, firstInGroup = true, customContent }) {
  const { user } = useMockedUser();

  const { me, senderDetails, hasImage } = useMessage({
    message,
    participants,
    currentUserId: `${user?.id}`,
  });

  const { firstName, avatarUrl } = senderDetails;

  const { body, createdAt } = message;

  const renderInfo = firstInGroup && (
    <Typography
      noWrap
      variant="caption"
      sx={{ mb: 1, color: 'text.disabled', ...(!me && { mr: 'auto' }) }}
    >
      {!me && `${firstName}`}
    </Typography>
  );

  const renderBody = customContent || (
    <Stack
      sx={{
        p: 1.5,
        minWidth: 48,
        maxWidth: 320,
        borderRadius: 1.5,
        typography: 'body2',
        bgcolor: 'background.neutral',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        ...(me && { color: 'grey.800', bgcolor: 'primary.lighter' }),
        ...(hasImage && { p: 0, bgcolor: 'transparent', border: 'none' }),
      }}
    >
      {isTyping ? (
        <Stack direction="row" spacing={0.5}>
          <m.div
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ ...dotTransition, delay: 0 }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'currentColor',
            }}
          />
          <m.div
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ ...dotTransition, delay: 0.2 }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'currentColor',
            }}
          />
          <m.div
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ ...dotTransition, delay: 0.4 }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'currentColor',
            }}
          />
        </Stack>
      ) : hasImage ? (
        <Box
          component="img"
          alt="attachment"
          src={body}
          onClick={() => onOpenLightbox(body)}
          sx={{
            width: 400,
            height: 'auto',
            borderRadius: 1.5,
            cursor: 'pointer',
            objectFit: 'cover',
            aspectRatio: '16/11',
            '&:hover': { opacity: 0.9 },
          }}
        />
      ) : (
        body
      )}
    </Stack>
  );


  const content = (
    <Stack direction="row" justifyContent={me ? 'flex-end' : 'unset'} alignItems="flex-start" sx={{ mt: firstInGroup ? 5 : 0.5, mb: 0 }}>
      {!me && firstInGroup && <Avatar alt={firstName} src={avatarUrl} sx={{ width: 32, height: 32, mr: 2 }} />}
      {!me && !firstInGroup && <Box sx={{ width: 32, mr: 2 }} />}

      <Stack alignItems={me ? 'flex-end' : 'flex-start'}>
        {renderInfo}

        <Stack
          direction="row"
          alignItems="center"
          sx={{ position: 'relative' }}
        >
          {renderBody}
        </Stack>
      </Stack>
    </Stack>
  );

  if (isTyping) {
    return (
      <m.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {content}
      </m.div>
    );
  }

  return content;
}
