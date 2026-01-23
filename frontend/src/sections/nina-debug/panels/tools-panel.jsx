import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Section, TOOL_CATEGORIES } from '../components/shared';

// ----------------------------------------------------------------------

export function ToolsPanel({ tools, editMode, saving, onSave }) {
  const [enabledCategories, setEnabledCategories] = useState([]);

  useEffect(() => {
    if (tools) {
      setEnabledCategories(tools.categories || []);
    }
  }, [tools]);

  const handleToggle = (cat) => {
    if (enabledCategories.includes(cat)) {
      setEnabledCategories(enabledCategories.filter(c => c !== cat));
    } else {
      setEnabledCategories([...enabledCategories, cat]);
    }
  };

  const handleSave = () => {
    onSave({ config: { enabled_tool_categories: enabledCategories } });
  };

  if (!tools) return <Typography color="text.secondary">No tools</Typography>;

  if (editMode) {
    return (
      <Stack spacing={2}>
        <Section title="Enable/Disable Categories">
          {TOOL_CATEGORIES.map((cat) => (
            <FormControlLabel
              key={cat}
              control={
                <Switch
                  size="small"
                  checked={enabledCategories.includes(cat)}
                  onChange={() => handleToggle(cat)}
                />
              }
              label={<Typography variant="body2" sx={{ fontSize: 12 }}>{cat}</Typography>}
            />
          ))}
        </Section>

        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving && <CircularProgress size={16} />}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>

        <Section title={`All Tools (${tools.available.length})`}>
          {tools.available.map((tool) => (
            <Box key={tool.name} sx={{ mb: 0.5, p: 0.5, bgcolor: enabledCategories.includes(tool.category) ? 'success.lighter' : 'grey.100', borderRadius: 1, opacity: enabledCategories.includes(tool.category) ? 1 : 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>{tool.name}</Typography>
                <Chip label={tool.category} size="small" sx={{ height: 16, fontSize: 9 }} />
              </Stack>
            </Box>
          ))}
        </Section>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Section title="Categories">
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {tools.categories.length > 0 ? tools.categories.map((cat) => (
            <Chip key={cat} label={cat} size="small" color="primary" variant="outlined" sx={{ height: 20 }} />
          )) : <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None enabled</Typography>}
        </Stack>
      </Section>
      <Section title={`Available (${tools.available.length})`}>
        {tools.available.map((tool) => (
          <Box key={tool.name} sx={{ mb: 0.5, p: 0.5, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>{tool.name}</Typography>
              <Chip label={tool.category} size="small" sx={{ height: 16, fontSize: 9 }} />
            </Stack>
            {tool.instruction && <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{tool.instruction}</Typography>}
          </Box>
        ))}
      </Section>
    </Stack>
  );
}
