import { memo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { useAgentForm } from '../agent-form-context';

// ----------------------------------------------------------------------

export const GuardrailsSection = memo(() => {
  const { avoidTopics, escalationTriggers, customGuardrails, setField, toggleInArray } = useAgentForm();

  return (
    <Stack spacing={3}>
      {/* Avoid Topics */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Tópicos a Evitar
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          O agente não falará sobre estes assuntos
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {agentSchemas.guardrailOptions.commonAvoidTopics.map((topic) => (
            <Chip
              key={topic.id}
              label={topic.label}
              onClick={() => toggleInArray('avoidTopics', topic.id)}
              variant={avoidTopics.includes(topic.id) ? 'filled' : 'outlined'}
              color={avoidTopics.includes(topic.id) ? 'error' : 'default'}
            />
          ))}
        </Box>
      </Box>

      {/* Escalation Triggers */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Gatilhos de Escalonamento
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Situações que transferem para um humano
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {agentSchemas.guardrailOptions.commonEscalationTriggers.map((trigger) => (
            <Chip
              key={trigger.id}
              label={trigger.label}
              onClick={() => toggleInArray('escalationTriggers', trigger.id)}
              variant={escalationTriggers.includes(trigger.id) ? 'filled' : 'outlined'}
              color={escalationTriggers.includes(trigger.id) ? 'warning' : 'default'}
            />
          ))}
        </Box>
      </Box>

      {/* Custom Guardrails */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Regras Personalizadas
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          size="small"
          value={customGuardrails}
          onChange={(e) => setField('customGuardrails', e.target.value)}
          placeholder="Restrições adicionais em linguagem natural..."
        />
      </Box>
    </Stack>
  );
});
