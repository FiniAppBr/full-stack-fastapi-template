import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

import { Section, KV } from '../components/shared';

// ----------------------------------------------------------------------

export function ConfigPanel({ data, editMode, saving, onSave }) {
  const { config } = data;
  const [localConfig, setLocalConfig] = useState(null);

  useEffect(() => {
    if (editMode && config) {
      setLocalConfig({
        name: data.agent_name,
        description: data.agent_description || '',
        model: config.generation.model,
        temperature: config.generation.temperature,
        max_messages: config.multi_message.max_messages,
        preferred_messages: config.multi_message.preferred_messages,
        max_response_length: config.multi_message.max_response_length,
        history_turns: config.generation.history_turns,
        similarity_threshold: config.rag.similarity_threshold,
        category_limits: config.rag.category_limits || {
          documents: 3, products: 2, policies: 1, faq: 2, people: 1, objections: 1,
        },
        objectives: config.objectives || [],
        guardrails: config.guardrails || { never_do: [], always_do: [], never_say: [] },
      });
    }
  }, [editMode, config, data.agent_name, data.agent_description]);

  const handleSave = () => {
    if (!localConfig) return;
    onSave({
      name: localConfig.name,
      description: localConfig.description,
      config: {
        ...data.raw_config,
        personality: {
          ...data.raw_config?.personality,
          max_messages: localConfig.max_messages,
          min_messages: localConfig.preferred_messages,
          max_response_length: localConfig.max_response_length,
        },
        models: {
          ...data.raw_config?.models,
          generation: {
            model: localConfig.model,
            temperature: localConfig.temperature,
          },
        },
        funnel: {
          ...data.raw_config?.funnel,
          objectives: localConfig.objectives.map(obj => ({
            objective: obj.description || obj.objective,
            priority: obj.priority || 0,
          })),
        },
        guardrails: {
          never_say: localConfig.guardrails.never_say?.map(r => typeof r === 'string' ? r : r.text) || [],
          never_do: localConfig.guardrails.never_do?.map(r => typeof r === 'string' ? r : r.text) || [],
          always_do: localConfig.guardrails.always_do?.map(r => typeof r === 'string' ? r : r.text) || [],
          avoid_topics: data.raw_config?.guardrails?.avoid_topics || [],
          escalation_triggers: data.raw_config?.guardrails?.escalation_triggers || [],
        },
        rag: {
          ...data.raw_config?.rag,
          similarity_threshold: localConfig.similarity_threshold,
          category_limits: localConfig.category_limits,
        },
      },
    });
  };

  if (editMode && localConfig) {
    return (
      <Stack spacing={2}>
        <Section title="Identity">
          <TextField
            fullWidth
            size="small"
            label="Agent Name"
            value={localConfig.name}
            onChange={(e) => setLocalConfig({ ...localConfig, name: e.target.value })}
            sx={{ mb: 1 }}
          />
          <TextField
            fullWidth
            size="small"
            label="Model"
            value={localConfig.model}
            onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
            sx={{ mb: 1 }}
          />
          <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Temperature: {localConfig.temperature}</Typography>
          <Slider
            size="small"
            value={localConfig.temperature}
            onChange={(e, v) => setLocalConfig({ ...localConfig, temperature: v })}
            min={0}
            max={1}
            step={0.1}
            valueLabelDisplay="auto"
          />
        </Section>

        <Section title="Prompt / Personality">
          <TextField
            fullWidth
            multiline
            rows={8}
            label="Agent Description (shown in system prompt)"
            value={localConfig.description}
            onChange={(e) => setLocalConfig({ ...localConfig, description: e.target.value })}
            helperText="This is the main personality/behavior instruction shown to the LLM"
          />
        </Section>

        <Section title="Response">
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <TextField
              size="small"
              label="Min Messages"
              type="number"
              value={localConfig.preferred_messages}
              onChange={(e) => setLocalConfig({ ...localConfig, preferred_messages: parseInt(e.target.value, 10) })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Max Messages"
              type="number"
              value={localConfig.max_messages}
              onChange={(e) => setLocalConfig({ ...localConfig, max_messages: parseInt(e.target.value, 10) })}
              sx={{ flex: 1 }}
            />
          </Stack>
          <TextField
            fullWidth
            size="small"
            label="Max Response Length"
            type="number"
            value={localConfig.max_response_length}
            onChange={(e) => setLocalConfig({ ...localConfig, max_response_length: parseInt(e.target.value, 10) })}
          />
        </Section>

        <Section title="Objectives">
          {localConfig.objectives.map((obj, idx) => (
            <Stack key={idx} direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                label="Priority"
                type="number"
                value={obj.priority || 0}
                onChange={(e) => {
                  const newObjs = [...localConfig.objectives];
                  newObjs[idx] = { ...newObjs[idx], priority: parseInt(e.target.value, 10) };
                  setLocalConfig({ ...localConfig, objectives: newObjs });
                }}
                sx={{ width: 80 }}
              />
              <TextField
                size="small"
                label="Objective"
                value={obj.description || obj.objective || ''}
                onChange={(e) => {
                  const newObjs = [...localConfig.objectives];
                  newObjs[idx] = { ...newObjs[idx], description: e.target.value };
                  setLocalConfig({ ...localConfig, objectives: newObjs });
                }}
                sx={{ flex: 1 }}
              />
              <IconButton size="small" color="error" onClick={() => {
                setLocalConfig({ ...localConfig, objectives: localConfig.objectives.filter((_, i) => i !== idx) });
              }}>
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Stack>
          ))}
          <Button
            size="small"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={() => setLocalConfig({ ...localConfig, objectives: [...localConfig.objectives, { priority: 0, description: '' }] })}
          >
            Add Objective
          </Button>
        </Section>

        <Section title="Guardrails">
          <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>NEVER DO:</Typography>
          {(localConfig.guardrails.never_do || []).map((rule, idx) => (
            <Stack key={`nd${idx}`} direction="row" spacing={1} sx={{ mb: 0.5 }}>
              <TextField
                size="small"
                fullWidth
                value={typeof rule === 'string' ? rule : rule.text}
                onChange={(e) => {
                  const newRules = [...localConfig.guardrails.never_do];
                  newRules[idx] = e.target.value;
                  setLocalConfig({ ...localConfig, guardrails: { ...localConfig.guardrails, never_do: newRules } });
                }}
              />
              <IconButton size="small" color="error" onClick={() => {
                setLocalConfig({ ...localConfig, guardrails: { ...localConfig.guardrails, never_do: localConfig.guardrails.never_do.filter((_, i) => i !== idx) } });
              }}>
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Stack>
          ))}
          <Button size="small" onClick={() => setLocalConfig({ ...localConfig, guardrails: { ...localConfig.guardrails, never_do: [...(localConfig.guardrails.never_do || []), ''] } })}>
            + Never Do
          </Button>

          <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, mt: 1, display: 'block' }}>ALWAYS DO:</Typography>
          {(localConfig.guardrails.always_do || []).map((rule, idx) => (
            <Stack key={`ad${idx}`} direction="row" spacing={1} sx={{ mb: 0.5 }}>
              <TextField
                size="small"
                fullWidth
                value={typeof rule === 'string' ? rule : rule.text}
                onChange={(e) => {
                  const newRules = [...localConfig.guardrails.always_do];
                  newRules[idx] = e.target.value;
                  setLocalConfig({ ...localConfig, guardrails: { ...localConfig.guardrails, always_do: newRules } });
                }}
              />
              <IconButton size="small" color="error" onClick={() => {
                setLocalConfig({ ...localConfig, guardrails: { ...localConfig.guardrails, always_do: localConfig.guardrails.always_do.filter((_, i) => i !== idx) } });
              }}>
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Stack>
          ))}
          <Button size="small" onClick={() => setLocalConfig({ ...localConfig, guardrails: { ...localConfig.guardrails, always_do: [...(localConfig.guardrails.always_do || []), ''] } })}>
            + Always Do
          </Button>

          <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600, mt: 1, display: 'block' }}>NEVER SAY:</Typography>
          {(localConfig.guardrails.never_say || []).map((rule, idx) => (
            <Stack key={`ns${idx}`} direction="row" spacing={1} sx={{ mb: 0.5 }}>
              <TextField
                size="small"
                fullWidth
                value={typeof rule === 'string' ? rule : rule.text}
                onChange={(e) => {
                  const newRules = [...localConfig.guardrails.never_say];
                  newRules[idx] = e.target.value;
                  setLocalConfig({ ...localConfig, guardrails: { ...localConfig.guardrails, never_say: newRules } });
                }}
              />
              <IconButton size="small" color="error" onClick={() => {
                setLocalConfig({ ...localConfig, guardrails: { ...localConfig.guardrails, never_say: localConfig.guardrails.never_say.filter((_, i) => i !== idx) } });
              }}>
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Stack>
          ))}
          <Button size="small" onClick={() => setLocalConfig({ ...localConfig, guardrails: { ...localConfig.guardrails, never_say: [...(localConfig.guardrails.never_say || []), ''] } })}>
            + Never Say
          </Button>
        </Section>

        <Section title="RAG Settings">
          <TextField
            fullWidth
            size="small"
            label="Similarity Threshold"
            type="number"
            inputProps={{ step: 0.05, min: 0, max: 1 }}
            value={localConfig.similarity_threshold}
            onChange={(e) => setLocalConfig({ ...localConfig, similarity_threshold: parseFloat(e.target.value) })}
            sx={{ mb: 2 }}
            helperText="Minimum similarity score (0-1) for RAG retrieval"
          />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Category Limits (max chunks per category):
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
            {Object.entries(localConfig.category_limits).map(([cat, limit]) => (
              <TextField
                key={cat}
                size="small"
                label={cat}
                type="number"
                inputProps={{ min: 0, max: 10 }}
                value={limit}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  category_limits: { ...localConfig.category_limits, [cat]: parseInt(e.target.value, 10) }
                })}
              />
            ))}
          </Box>
        </Section>

        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving && <CircularProgress size={16} />}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Stack>
    );
  }

  // View mode
  return (
    <Stack spacing={1.5}>
      <Section title="Identity">
        <KV label="Name" value={data.agent_name} />
        <KV label="ID" value={data.agent_id} />
        <KV label="Model" value={config.generation.model} />
        <KV label="Temperature" value={config.generation.temperature} />
      </Section>
      <Section title="Prompt / Personality">
        <Typography variant="body2" sx={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>
          {data.agent_description || 'No description set'}
        </Typography>
      </Section>
      <Section title="Response">
        <KV label="Messages" value={`${config.multi_message.preferred_messages}-${config.multi_message.max_messages}`} />
        <KV label="Max chars" value={config.multi_message.max_response_length} />
        <KV label="History turns" value={config.generation.history_turns} />
      </Section>
      <Section title="RAG">
        <KV label="Similarity threshold" value={config.rag.similarity_threshold} />
        <KV label="Context turns" value={config.rag.context_turns} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 0.5 }}>Category limits:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {Object.entries(config.rag.category_limits || { documents: 3, products: 2, policies: 1, faq: 2, people: 1, objections: 1 }).map(([cat, limit]) => (
            <Chip key={cat} label={`${cat}: ${limit}`} size="small" sx={{ height: 18, fontSize: 9 }} />
          ))}
          <Chip label="guardrails: excluded" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: 9 }} />
        </Box>
      </Section>

      {/* Objectives from config (funnel objectives) */}
      <Section title={`Objectives (${config.objectives.length})`}>
        {config.objectives.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None defined</Typography>}
        {config.objectives.map((obj, idx) => (
          <Box key={idx} sx={{ mb: 0.5, p: 0.5, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Chip label={`P${obj.priority}`} size="small" sx={{ height: 16, fontSize: 9, minWidth: 32 }} />
              <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 500 }}>{obj.id}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 10, mt: 0.25 }}>
              {obj.description || <em>No hint</em>}
            </Typography>
          </Box>
        ))}
      </Section>

      {/* Data Collection Fields (all fields, including those without hints) */}
      <Section title="Data Collection Fields">
        {(!data.raw_config?.data_collection?.fields || data.raw_config.data_collection.fields.length === 0) && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None defined</Typography>
        )}
        {data.raw_config?.data_collection?.fields?.map((field, i) => {
          const fieldInfo = data.contact_fields?.[field.field_id];
          const hasHint = field.collection_hint && field.collection_hint.trim();
          return (
            <Box
              key={i}
              sx={{
                mb: 0.5,
                p: 0.5,
                bgcolor: hasHint ? 'info.lighter' : 'warning.lighter',
                borderRadius: 1,
                borderLeft: 3,
                borderColor: hasHint ? 'info.main' : 'warning.main',
              }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Chip
                  label={field.necessity || 'optional'}
                  size="small"
                  sx={{ height: 16, fontSize: 9 }}
                  color={field.necessity === 'required' ? 'error' : field.necessity === 'recommended' ? 'warning' : 'default'}
                />
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>
                  {fieldInfo?.label || `Field #${field.field_id}`}
                </Typography>
                {fieldInfo?.key && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>({fieldInfo.key})</Typography>
                )}
              </Stack>
              {hasHint ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 10, mt: 0.5 }}>
                  <strong>Hint:</strong> {field.collection_hint}
                </Typography>
              ) : (
                <Typography variant="body2" color="warning.dark" sx={{ fontSize: 10, mt: 0.5, fontStyle: 'italic' }}>
                  No collection hint - LLM won&apos;t know how to collect this
                </Typography>
              )}
            </Box>
          );
        })}
      </Section>

      <Section title="Guardrails">
        {config.guardrails.never_do.map((r, i) => (
          <Typography key={`nd${i}`} variant="body2" color="error.main" sx={{ fontSize: 11 }}>• NEVER: {r.text}</Typography>
        ))}
        {config.guardrails.always_do.map((r, i) => (
          <Typography key={`ad${i}`} variant="body2" color="success.main" sx={{ fontSize: 11 }}>• ALWAYS: {r.text}</Typography>
        ))}
        {config.guardrails.never_say.map((r, i) => (
          <Typography key={`ns${i}`} variant="body2" color="warning.main" sx={{ fontSize: 11 }}>• NEVER SAY: &quot;{r.text}&quot;</Typography>
        ))}
        {config.guardrails.never_do.length === 0 && config.guardrails.always_do.length === 0 && config.guardrails.never_say.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None defined</Typography>
        )}
      </Section>

      <Section title={`Escalation Triggers (${config.escalation_triggers?.length || 0})`}>
        {(!config.escalation_triggers || config.escalation_triggers.length === 0) && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None defined</Typography>
        )}
        {config.escalation_triggers?.map((trigger, i) => (
          <Box key={i} sx={{ mb: 0.5, p: 0.5, bgcolor: 'warning.lighter', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontSize: 11 }}><b>If:</b> {trigger.condition}</Typography>
            <Typography variant="body2" sx={{ fontSize: 11 }}><b>Then:</b> {trigger.message || 'Transfer to human'}</Typography>
          </Box>
        ))}
      </Section>

      <Section title="Typing Simulation">
        <KV label="Enabled" value={config.multi_message.typing?.enabled ? 'Yes' : 'No'} />
        <KV label="Base delay" value={`${config.multi_message.typing?.base_ms || 800}ms`} />
        <KV label="Per char" value={`${config.multi_message.typing?.per_char_ms || 30}ms`} />
        <KV label="Max delay" value={`${config.multi_message.typing?.max_delay_ms || 3000}ms`} />
      </Section>
    </Stack>
  );
}
