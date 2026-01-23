import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function PromptPanel({ prompt }) {
  if (!prompt) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">No prompt available</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ p: 1, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, fontFamily: 'monospace', fontSize: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {prompt}
    </Box>
  );
}
