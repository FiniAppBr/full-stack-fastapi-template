import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export default function AnalyticsView() {
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 5 }}>
        Agent Analytics
      </Typography>

      <Box
        sx={{
          p: 3,
          bgcolor: 'background.neutral',
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Analytics Dashboard Coming Soon
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Goal tracking, stage performance, and optimization suggestions
        </Typography>
      </Box>
    </Container>
  );
}
