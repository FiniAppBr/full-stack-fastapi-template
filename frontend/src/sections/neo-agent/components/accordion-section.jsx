import { memo } from 'react';

import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const AccordionSection = memo(({
  id,
  title,
  expanded,
  onChange,
  children,
  defaultExpanded = false,
}) => {
  return (
    <Accordion
      expanded={expanded === id}
      onChange={() => onChange(expanded === id ? null : id)}
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        '&:before': { display: 'none' },
        boxShadow: 'none',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        mb: 1.5,
        '&.Mui-expanded': {
          margin: 0,
          mb: 1.5,
        },
      }}
    >
      <AccordionSummary
        expandIcon={<Iconify icon="eva:chevron-down-fill" />}
        sx={{
          px: 2.5,
          py: 0.5,
          minHeight: 56,
          '& .MuiAccordionSummary-content': {
            my: 1.5,
          },
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
        <Box>{children}</Box>
      </AccordionDetails>
    </Accordion>
  );
});
