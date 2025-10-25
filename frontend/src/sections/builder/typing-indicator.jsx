import { m } from 'framer-motion';

import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

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

export function TypingIndicator() {
  return (
    <Stack direction="row" sx={{ mb: 5 }}>
      <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: 'primary.main' }}>
        AI
      </Avatar>

      <Stack alignItems="flex-start">
        <Typography variant="caption" sx={{ mb: 1, color: 'text.disabled' }}>
          Builder AI
        </Typography>

        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            p: 1.5,
            minWidth: 48,
            borderRadius: 1,
            bgcolor: 'background.neutral',
          }}
        >
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
      </Stack>
    </Stack>
  );
}
