import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export const CATEGORY_COLORS = {
  documents: 'info',
  products: 'success',
  policies: 'warning',
  faq: 'secondary',
  people: 'primary',
  objections: 'error',
  guardrails: 'error',
};

export const TOOL_CATEGORIES = ['core', 'calendar', 'inventory', 'pipeline', 'kanban', 'contact'];

// ----------------------------------------------------------------------

export function Section({ title, children }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontSize: 11, fontWeight: 600, mb: 0.5, color: 'text.secondary', textTransform: 'uppercase' }}>
        {title}
      </Typography>
      {children}
      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}

export function KV({ label, value }) {
  return (
    <Typography variant="body2" sx={{ fontSize: 11 }}>
      <Box component="span" sx={{ color: 'text.secondary' }}>{label}:</Box> {value}
    </Typography>
  );
}

export function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
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
        <Typography variant="body2" sx={{ fontSize: 13 }}>{message.content}</Typography>
        {message.typing_delay_ms && (
          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.25, fontSize: 9 }}>
            {message.typing_delay_ms}ms
          </Typography>
        )}
      </Box>
    </Box>
  );
}
