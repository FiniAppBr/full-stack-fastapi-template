import { memo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { useFormField, useFormActions } from '../agent-form-context';

// ----------------------------------------------------------------------

export const AdvancedSection = memo(() => {
  const extractionModel = useFormField('extractionModel');
  const generationModel = useFormField('generationModel');
  const extractionTemp = useFormField('extractionTemp');
  const generationTemp = useFormField('generationTemp');
  const typingEnabled = useFormField('typingEnabled');
  const typingBaseMs = useFormField('typingBaseMs');
  const typingPerCharMs = useFormField('typingPerCharMs');
  const typingMaxDelayMs = useFormField('typingMaxDelayMs');
  const { setField } = useFormActions();

  return (
    <Stack spacing={3}>
      {/* Models */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Modelos de IA
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Modelos para extração e geração
        </Typography>

        {/* Extraction Model */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Modelo de Extração
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {agentSchemas.advancedOptions.modelOptions.map((model) => (
              <Chip
                key={model.id}
                label={model.label}
                onClick={() => setField('extractionModel', model.id)}
                variant={extractionModel === model.id ? 'filled' : 'outlined'}
                color={extractionModel === model.id ? 'primary' : 'default'}
                size="small"
              />
            ))}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="caption" sx={{ minWidth: 80 }}>
              Temp: {extractionTemp}
            </Typography>
            <Slider
              value={extractionTemp}
              onChange={(e, v) => setField('extractionTemp', v)}
              min={0}
              max={1}
              step={0.1}
              size="small"
              sx={{ width: 150 }}
            />
          </Stack>
        </Box>

        {/* Generation Model */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Modelo de Geração
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {agentSchemas.advancedOptions.modelOptions.map((model) => (
              <Chip
                key={model.id}
                label={model.label}
                onClick={() => setField('generationModel', model.id)}
                variant={generationModel === model.id ? 'filled' : 'outlined'}
                color={generationModel === model.id ? 'primary' : 'default'}
                size="small"
              />
            ))}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="caption" sx={{ minWidth: 80 }}>
              Temp: {generationTemp}
            </Typography>
            <Slider
              value={generationTemp}
              onChange={(e, v) => setField('generationTemp', v)}
              min={0}
              max={1}
              step={0.1}
              size="small"
              sx={{ width: 150 }}
            />
          </Stack>
        </Box>
      </Box>

      <Divider />

      {/* Typing Simulation */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="subtitle2">Simulação de Digitação</Typography>
            <Typography variant="caption" color="text.secondary">
              Delay entre mensagens para parecer natural
            </Typography>
          </Box>
          <Switch
            checked={typingEnabled}
            onChange={(e) => setField('typingEnabled', e.target.checked)}
            size="small"
          />
        </Stack>

        {typingEnabled && (
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Delay base: {typingBaseMs}ms
              </Typography>
              <Slider
                value={typingBaseMs}
                onChange={(e, v) => setField('typingBaseMs', v)}
                min={200}
                max={2000}
                step={100}
                size="small"
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Por caractere: {typingPerCharMs}ms
              </Typography>
              <Slider
                value={typingPerCharMs}
                onChange={(e, v) => setField('typingPerCharMs', v)}
                min={10}
                max={80}
                step={5}
                size="small"
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Máximo: {typingMaxDelayMs}ms
              </Typography>
              <Slider
                value={typingMaxDelayMs}
                onChange={(e, v) => setField('typingMaxDelayMs', v)}
                min={1000}
                max={5000}
                step={500}
                size="small"
              />
            </Box>
          </Stack>
        )}
      </Box>
    </Stack>
  );
});
