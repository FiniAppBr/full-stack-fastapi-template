import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import Slider from '@mui/material/Slider';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import axios, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const DEBUG_CHAT_ENDPOINT = '/api/v1/chat/debug/chat';
const DEBUG_AGENT_ENDPOINT = '/api/v1/chat/debug/agent';

const TOOL_CATEGORIES = ['core', 'calendar', 'inventory', 'pipeline', 'kanban', 'contact'];

const CATEGORY_COLORS = {
  documents: 'info',
  products: 'success',
  policies: 'warning',
  faq: 'secondary',
  people: 'primary',
  objections: 'error',
  guardrails: 'error',
};

export function NinaDebugView() {
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [agentDebug, setAgentDebug] = useState(null);
  const [loadingAgentDebug, setLoadingAgentDebug] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(`debug-${Date.now()}`);

  const [turnDebug, setTurnDebug] = useState(null);
  const [selectedTurnIndex, setSelectedTurnIndex] = useState(null);
  const [turnHistory, setTurnHistory] = useState([]);

  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const messagesEndRef = useRef(null);

  // All entities for linking
  const [allEntities, setAllEntities] = useState([]);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await axios.get(endpoints.neoAgents.list);
        const agentList = response.data.data || [];
        setAgents(agentList);
        if (agentList.length > 0) setSelectedAgentId(agentList[0].id);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  // Fetch all entities for linking
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await axios.get(endpoints.entities.list);
        setAllEntities(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch entities:', error);
      }
    };
    fetchEntities();
  }, []);

  // Fetch agent debug info
  const fetchAgentDebug = useCallback(async () => {
    if (!selectedAgentId) return;
    setLoadingAgentDebug(true);
    try {
      const response = await axios.get(`${DEBUG_AGENT_ENDPOINT}/${selectedAgentId}`);
      setAgentDebug(response.data);
    } catch (error) {
      console.error('Failed to fetch agent debug:', error);
      setAgentDebug(null);
    } finally {
      setLoadingAgentDebug(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    fetchAgentDebug();
  }, [fetchAgentDebug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(DEBUG_CHAT_ENDPOINT, {
        message: userMessage,
        thread_id: threadId,
        agent_id: selectedAgentId,
      });
      const { data } = response;
      setLoading(false);

      (data.messages || []).forEach((msg) => {
        setMessages((prev) => [...prev, { role: 'assistant', content: msg.content, typing_delay_ms: msg.typing_delay_ms }]);
      });

      const newTurnDebug = {
        turnIndex: turnHistory.length,
        userMessage,
        response: data,
        debug: data.debug,
        state: data.state,
        tokens_used: data.tokens_used,
        latency_ms: data.latency_ms,
      };
      setTurnHistory((prev) => [...prev, newTurnDebug]);
      setTurnDebug(newTurnDebug);
      setSelectedTurnIndex(turnHistory.length);
      setActiveTab(3);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'error', content: `Error: ${error.message}` }]);
      setLoading(false);
    }
  }, [input, loading, threadId, selectedAgentId, turnHistory.length]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setTurnDebug(null);
    setTurnHistory([]);
    setSelectedTurnIndex(null);
    setThreadId(`debug-${Date.now()}`);
  };

  const handleTurnSelect = (index) => {
    setSelectedTurnIndex(index);
    setTurnDebug(turnHistory[index]);
  };

  // Save agent updates
  const handleSaveAgent = async (updates) => {
    if (!selectedAgentId) return;
    setSaving(true);
    try {
      await axios.patch(endpoints.neoAgents.update(selectedAgentId), updates);
      await fetchAgentDebug();
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save agent:', error);
      alert('Failed to save: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Update linked entities
  const handleUpdateLinkedEntities = async (entityIds) => {
    if (!selectedAgentId) return;
    setSaving(true);
    try {
      await axios.patch(endpoints.neoAgents.linkedEntities(selectedAgentId), entityIds);
      await fetchAgentDebug();
    } catch (error) {
      console.error('Failed to update linked entities:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardContent maxWidth={false} sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h5">Agent Debug</Typography>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Agent</InputLabel>
            <Select
              value={selectedAgentId || ''}
              label="Agent"
              onChange={(e) => { setSelectedAgentId(e.target.value); handleReset(); setEditMode(false); }}
              disabled={loadingAgents}
            >
              {agents.map((agent) => (
                <MenuItem key={agent.id} value={agent.id}>{agent.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant={editMode ? 'contained' : 'outlined'}
            color={editMode ? 'warning' : 'primary'}
            onClick={() => setEditMode(!editMode)}
            startIcon={<Iconify icon={editMode ? 'solar:close-circle-bold' : 'solar:pen-bold'} />}
          >
            {editMode ? 'Cancel' : 'Edit'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="info"
            onClick={async () => {
              try {
                const response = await axios.get(`/api/v1/chat/debug/export/${selectedAgentId}`);
                alert(`Exported to: ${response.data.file_path}`);
              } catch (error) {
                alert('Export failed: ' + error.message);
              }
            }}
            startIcon={<Iconify icon="solar:export-bold" />}
          >
            Export
          </Button>
        </Stack>
        <Button size="small" color="error" onClick={handleReset} startIcon={<Iconify icon="solar:restart-bold" />}>
          Reset Chat
        </Button>
      </Stack>

      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 140px)' }}>
        {/* DEBUG PANEL - 50% */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 36 }}>
            <Tab label="Config" sx={{ minHeight: 36, py: 0, fontSize: 11 }} />
            <Tab label="Tools" sx={{ minHeight: 36, py: 0, fontSize: 11 }} />
            <Tab label="Entities" sx={{ minHeight: 36, py: 0, fontSize: 11 }} />
            <Tab label="Debug" sx={{ minHeight: 36, py: 0, fontSize: 11 }} />
            <Tab label="RAG" sx={{ minHeight: 36, py: 0, fontSize: 11 }} />
            <Tab label="Prompt" sx={{ minHeight: 36, py: 0, fontSize: 11 }} />
            <Tab label="History" sx={{ minHeight: 36, py: 0, fontSize: 11 }} />
          </Tabs>

          {/* Turn selector */}
          {turnHistory.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ p: 0.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
              <Typography variant="caption" sx={{ px: 1, alignSelf: 'center' }}>Turn:</Typography>
              {turnHistory.map((turn, idx) => (
                <Chip
                  key={idx}
                  label={idx + 1}
                  size="small"
                  variant={selectedTurnIndex === idx ? 'filled' : 'outlined'}
                  color={selectedTurnIndex === idx ? 'primary' : 'default'}
                  onClick={() => handleTurnSelect(idx)}
                  sx={{ minWidth: 28, height: 22 }}
                />
              ))}
            </Stack>
          )}

          <Scrollbar sx={{ flex: 1, p: 1.5 }}>
            {loadingAgentDebug ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
            ) : (
              <>
                {activeTab === 0 && agentDebug && (
                  <ConfigPanel
                    data={agentDebug}
                    editMode={editMode}
                    saving={saving}
                    onSave={handleSaveAgent}
                  />
                )}
                {activeTab === 1 && agentDebug && (
                  <ToolsPanel
                    tools={agentDebug.tools}
                    editMode={editMode}
                    saving={saving}
                    onSave={handleSaveAgent}
                  />
                )}
                {activeTab === 2 && agentDebug && (
                  <EntitiesPanel
                    entities={agentDebug.entities}
                    allEntities={allEntities}
                    linkedEntityIds={agentDebug.config?.linked_entities || []}
                    editMode={editMode}
                    saving={saving}
                    onUpdateLinks={handleUpdateLinkedEntities}
                    onRefresh={fetchAgentDebug}
                  />
                )}
                {activeTab === 3 && <DebugPanel turnDebug={turnDebug} />}
                {activeTab === 4 && <RAGPanel assembled={turnDebug?.debug?.assembled} />}
                {activeTab === 5 && <PromptPanel prompt={turnDebug?.debug?.system_prompt || agentDebug?.sample_prompt} />}
                {activeTab === 6 && <HistoryPanel state={turnDebug?.state} />}
              </>
            )}
          </Scrollbar>
        </Card>

        {/* CHAT PANEL - 50% */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Scrollbar sx={{ flex: 1, p: 2 }}>
            <Stack spacing={1.5}>
              {messages.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Iconify icon="solar:chat-dots-bold-duotone" width={48} sx={{ mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2">Send a message to start</Typography>
                </Box>
              )}
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
              {loading && <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}><CircularProgress size={20} /></Box>}
              <div ref={messagesEndRef} />
            </Stack>
          </Scrollbar>
          <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <IconButton color="primary" onClick={handleSend} disabled={loading || !input.trim()}>
              <Iconify icon="solar:plain-bold" />
            </IconButton>
          </Stack>
        </Card>
      </Box>
    </DashboardContent>
  );
}

// =============================================================================
// CONFIG PANEL (with editing)
// =============================================================================

function ConfigPanel({ data, editMode, saving, onSave }) {
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
        category_limits: data.raw_config?.rag?.category_limits || {
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
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            ⚠️ guardrails category is excluded from RAG (comes from config)
          </Typography>
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
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 0.5 }}>Category limits:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <Chip label="documents: 3" size="small" sx={{ height: 18, fontSize: 9 }} />
          <Chip label="products: 2" size="small" sx={{ height: 18, fontSize: 9 }} />
          <Chip label="policies: 1" size="small" sx={{ height: 18, fontSize: 9 }} />
          <Chip label="faq: 2" size="small" sx={{ height: 18, fontSize: 9 }} />
          <Chip label="people: 1" size="small" sx={{ height: 18, fontSize: 9 }} />
          <Chip label="objections: 1" size="small" sx={{ height: 18, fontSize: 9 }} />
          <Chip label="guardrails: excluded" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: 9 }} />
        </Box>
      </Section>
      <Section title={`Objectives (${config.objectives.length})`}>
        {config.objectives.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None</Typography>}
        {config.objectives.map((obj, idx) => (
          <Box key={idx} sx={{ mb: 0.5, p: 0.5, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontSize: 11 }}><b>P{obj.priority}:</b> {obj.description}</Typography>
          </Box>
        ))}
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
      <Section title="Data Collection Fields">
        {(!data.raw_config?.data_collection?.fields || data.raw_config.data_collection.fields.length === 0) && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None defined</Typography>
        )}
        {data.raw_config?.data_collection?.fields?.map((field, i) => {
          const fieldInfo = data.contact_fields?.[field.field_id];
          return (
            <Box key={i} sx={{ mb: 0.5, p: 0.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={field.necessity || 'optional'} size="small" sx={{ height: 16, fontSize: 9 }} color={field.necessity === 'required' ? 'error' : field.necessity === 'recommended' ? 'warning' : 'default'} />
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>
                  {fieldInfo?.label || `Field #${field.field_id}`}
                </Typography>
                {fieldInfo?.key && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>({fieldInfo.key})</Typography>
                )}
              </Stack>
              {field.collection_hint ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 10, mt: 0.5 }}>
                  Hint: {field.collection_hint}
                </Typography>
              ) : (
                <Typography variant="body2" color="warning.main" sx={{ fontSize: 10, mt: 0.5 }}>
                  No collection hint set
                </Typography>
              )}
            </Box>
          );
        })}
      </Section>
    </Stack>
  );
}

// =============================================================================
// TOOLS PANEL (with editing)
// =============================================================================

function ToolsPanel({ tools, editMode, saving, onSave }) {
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

// =============================================================================
// ENTITIES PANEL (with editing)
// =============================================================================

function EntitiesPanel({ entities, allEntities, linkedEntityIds, editMode, saving, onUpdateLinks, onRefresh }) {
  const [selectedEntityIds, setSelectedEntityIds] = useState([]);
  const [editingEntity, setEditingEntity] = useState(null);
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);

  useEffect(() => {
    setSelectedEntityIds(linkedEntityIds.map(id => parseInt(id, 10)));
  }, [linkedEntityIds]);

  const handleSaveLinks = () => {
    onUpdateLinks(selectedEntityIds);
  };

  const handleOpenEntityEdit = async (entityId) => {
    try {
      const response = await axios.get(endpoints.entities.details(entityId));
      setEditingEntity(response.data);
      setEntityDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch entity:', error);
    }
  };

  const handleSaveEntity = async () => {
    if (!editingEntity) return;
    try {
      await axios.patch(endpoints.entities.update(editingEntity.id), editingEntity);
      setEntityDialogOpen(false);
      setEditingEntity(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to save entity:', error);
      alert('Failed to save entity: ' + (error.message || 'Unknown error'));
    }
  };

  if (editMode) {
    return (
      <Stack spacing={2}>
        <Section title="Link Entities">
          <Autocomplete
            multiple
            size="small"
            options={allEntities}
            getOptionLabel={(option) => `${option.name} (${option.category})`}
            value={allEntities.filter(e => selectedEntityIds.includes(e.id))}
            onChange={(e, newValue) => setSelectedEntityIds(newValue.map(v => v.id))}
            renderInput={(params) => <TextField {...params} label="Linked Entities" placeholder="Search entities..." />}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={option.name}
                  size="small"
                  sx={{ height: 20 }}
                />
              ))
            }
          />
          <Button sx={{ mt: 1 }} variant="contained" onClick={handleSaveLinks} disabled={saving} startIcon={saving && <CircularProgress size={16} />}>
            {saving ? 'Saving...' : 'Save Links'}
          </Button>
        </Section>

        <Section title="Edit Entity Content">
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Click an entity to edit its content
          </Typography>
          {entities?.map((entity) => (
            <Box
              key={entity.id}
              onClick={() => handleOpenEntityEdit(entity.id)}
              sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'primary.lighter' } }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>{entity.name}</Typography>
                  <Chip label={entity.category} size="small" sx={{ height: 16, fontSize: 9 }} />
                </Stack>
                <Iconify icon="solar:pen-bold" width={14} />
              </Stack>
            </Box>
          ))}
        </Section>

        {/* Entity Edit Dialog */}
        <Dialog open={entityDialogOpen} onClose={() => setEntityDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Entity: {editingEntity?.name}</DialogTitle>
          <DialogContent>
            {editingEntity && (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={editingEntity.name || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, name: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Category"
                  value={editingEntity.category || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, category: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Template"
                  value={editingEntity.template || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, template: e.target.value })}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={editingEntity.description || ''}
                  onChange={(e) => setEditingEntity({ ...editingEntity, description: e.target.value })}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  label="Data (JSON)"
                  value={typeof editingEntity.data === 'string' ? editingEntity.data : JSON.stringify(editingEntity.data || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditingEntity({ ...editingEntity, data: parsed });
                    } catch {
                      // Keep as string if invalid JSON - will show error on save
                    }
                  }}
                  helperText="Edit JSON data for this entity"
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEntityDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEntity}>Save Entity</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  // View mode
  if (!entities || entities.length === 0) return <Typography color="text.secondary">No linked entities</Typography>;

  // Group by category
  const byCategory = {};
  entities.forEach(e => {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  });

  return (
    <Stack spacing={1.5}>
      {/* Category summary */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {Object.entries(byCategory).map(([cat, catEntities]) => (
          <Chip key={cat} label={`${cat}: ${catEntities.length}`} size="small" color={CATEGORY_COLORS[cat] || 'default'} sx={{ height: 18, fontSize: 9 }} />
        ))}
      </Box>

      {entities.map((entity) => (
        <Box key={entity.id} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, borderLeft: 3, borderColor: `${CATEGORY_COLORS[entity.category] || 'grey'}.main` }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>{entity.name}</Typography>
            <Chip label={entity.category} size="small" color={CATEGORY_COLORS[entity.category] || 'default'} sx={{ height: 16, fontSize: 9 }} />
            {entity.category === 'guardrails' && <Chip label="no RAG" size="small" variant="outlined" color="error" sx={{ height: 14, fontSize: 8 }} />}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
            {entity.chunk_count} chunks
          </Typography>
          {entity.capabilities.length > 0 && (
            <Stack direction="row" gap={0.5} sx={{ mt: 0.5 }}>
              {entity.capabilities.map((cap) => (
                <Chip key={cap} label={cap} size="small" color="info" variant="outlined" sx={{ height: 16, fontSize: 9 }} />
              ))}
            </Stack>
          )}
        </Box>
      ))}
    </Stack>
  );
}

// =============================================================================
// DEBUG PANEL
// =============================================================================

function DebugPanel({ turnDebug }) {
  if (!turnDebug) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">Send a message to see debug info</Typography>
      </Box>
    );
  }

  const { state, debug, latency_ms } = turnDebug;
  const tokens = debug?.tokens || {};
  const react = debug?.react || {};
  const validation = debug?.validation || {};
  const preprocessed = debug?.preprocessed || {};
  const extraction = debug?.extraction || {};
  const toolCalls = debug?.tool_calls || [];

  // Calculate LLM calls based on pipeline knowledge
  const agentCalls = react.iterations || 0;
  const extractCalls = 1; // Always 1
  const generateCalls = 1 + (validation.retry_count || 0);
  const validateCalls = debug?.assembled?.chunks?.length > 0 ? generateCalls : 0;
  const totalLLMCalls = agentCalls + extractCalls + generateCalls + validateCalls;

  return (
    <Stack spacing={1.5}>
      <Section title="Stats">
        <KV label="Turn" value={state?.turn_count} />
        <KV label="Latency" value={`${latency_ms}ms`} />
        <KV label="Tokens" value={`${tokens.total || 0} (in: ${tokens.in || 0}, out: ${tokens.out || 0})`} />
      </Section>

      <Section title={`LLM Calls (${totalLLMCalls})`}>
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          <Chip label={`AGENT: ${agentCalls}`} size="small" color={agentCalls > 0 ? 'primary' : 'default'} variant={agentCalls > 0 ? 'filled' : 'outlined'} sx={{ height: 20, fontSize: 9 }} />
          <Chip label={`EXTRACT: ${extractCalls}`} size="small" color="info" sx={{ height: 20, fontSize: 9 }} />
          <Chip label={`GENERATE: ${generateCalls}`} size="small" color="success" sx={{ height: 20, fontSize: 9 }} />
          <Chip label={`VALIDATE: ${validateCalls}`} size="small" color={validateCalls > 0 ? 'warning' : 'default'} variant={validateCalls > 0 ? 'filled' : 'outlined'} sx={{ height: 20, fontSize: 9 }} />
        </Stack>
        {agentCalls === 0 && <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, display: 'block', mt: 0.5 }}>AGENT skipped (no tools enabled or greeting detected)</Typography>}
        {validateCalls === 0 && <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, display: 'block' }}>VALIDATE skipped (no RAG chunks)</Typography>}
      </Section>

      <Section title="Validation">
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip label={validation.passed ? 'PASSED' : 'FAILED'} size="small" color={validation.passed ? 'success' : 'error'} sx={{ height: 20 }} />
          {validation.retry_count > 0 && <Chip label={`${validation.retry_count} retries`} size="small" color="warning" variant="outlined" sx={{ height: 20 }} />}
        </Stack>
        {validation.issues?.map((issue, i) => (
          <Alert key={i} severity="error" sx={{ py: 0, px: 1, mt: 0.5, '& .MuiAlert-message': { fontSize: 10 } }}>{issue}</Alert>
        ))}
      </Section>

      <Section title={`Tool Calls (${toolCalls.length})`}>
        {toolCalls.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None</Typography>}
        {toolCalls.map((call, idx) => (
          <Box key={idx} sx={{ mb: 0.5, p: 0.5, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>{call.name || call.tool}</Typography>
            <Box sx={{ p: 0.5, bgcolor: 'grey.200', borderRadius: 0.5, mt: 0.5 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 9, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(call.args || call.arguments, null, 2)}
              </Typography>
            </Box>
            {call.result && (
              <Box sx={{ p: 0.5, bgcolor: 'success.lighter', borderRadius: 0.5, mt: 0.5 }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 9, whiteSpace: 'pre-wrap' }}>
                  {typeof call.result === 'string' ? call.result : JSON.stringify(call.result, null, 2)}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Section>

      <Section title="Preprocessing">
        {Object.keys(preprocessed || {}).length === 0 && <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None</Typography>}
        {Object.entries(preprocessed || {}).map(([key, value]) => (
          <KV key={key} label={key} value={JSON.stringify(value)} />
        ))}
      </Section>

      <Section title="Extraction">
        {Object.keys(extraction || {}).length === 0 && <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None</Typography>}
        {Object.entries(extraction || {}).map(([key, value]) => (
          <KV key={key} label={key} value={JSON.stringify(value)} />
        ))}
      </Section>

      <Section title="Collected Data">
        {Object.keys(state?.collected_data || {}).length === 0 && <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>None</Typography>}
        {Object.entries(state?.collected_data || {}).map(([key, value]) => (
          <KV key={key} label={key} value={JSON.stringify(value)} />
        ))}
      </Section>
    </Stack>
  );
}

// =============================================================================
// RAG PANEL
// =============================================================================

function RAGPanel({ assembled }) {
  if (!assembled) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">Send a message to see RAG results</Typography>
      </Box>
    );
  }

  const { chunks, total_tokens, tool_context } = assembled;

  // Group chunks by category
  const byCategory = {};
  chunks?.forEach(chunk => {
    const cat = chunk.metadata?.category || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(chunk);
  });

  return (
    <Stack spacing={1.5}>
      <Section title={`Chunks (${chunks?.length || 0}) • ${total_tokens} tokens`}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {Object.entries(byCategory).map(([cat, catChunks]) => (
            <Chip key={cat} label={`${cat}: ${catChunks.length}`} size="small" color={CATEGORY_COLORS[cat] || 'default'} sx={{ height: 18, fontSize: 9 }} />
          ))}
        </Box>
      </Section>
      {chunks?.map((chunk, idx) => {
        const category = chunk.metadata?.category || 'unknown';
        return (
          <Box key={idx} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1, borderLeft: 3, borderColor: `${CATEGORY_COLORS[category] || 'grey'}.main` }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11 }}>{chunk.title || 'Untitled'}</Typography>
                <Chip label={category} size="small" color={CATEGORY_COLORS[category] || 'default'} sx={{ height: 16, fontSize: 8 }} />
              </Stack>
              <Chip
                label={`${(chunk.score * 100).toFixed(0)}%`}
                size="small"
                color={chunk.score > 0.7 ? 'success' : chunk.score > 0.5 ? 'warning' : 'default'}
                sx={{ height: 18, fontSize: 10 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
              {chunk.token_count} tokens • {chunk.is_entity ? 'Entity' : 'Knowledge'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontSize: 10, color: 'text.secondary' }}>{chunk.content}</Typography>
          </Box>
        );
      })}
      {tool_context && (
        <Section title="Tool Context">
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: 10 }}>{tool_context}</Typography>
        </Section>
      )}
    </Stack>
  );
}

// =============================================================================
// PROMPT PANEL
// =============================================================================

function PromptPanel({ prompt }) {
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

// =============================================================================
// HISTORY PANEL
// =============================================================================

function HistoryPanel({ state }) {
  if (!state || !state.history || state.history.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">Send a message to see conversation history</Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          This shows the messages sent to the LLM (limited by history_turns setting)
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Section title={`Conversation History (${state.history.length} messages)`}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          These are the messages included in the LLM context
        </Typography>
      </Section>
      {state.history.map((msg, idx) => (
        <Box
          key={idx}
          sx={{
            p: 1,
            bgcolor: msg.role === 'user' ? 'primary.lighter' : msg.role === 'assistant' ? 'grey.100' : 'warning.lighter',
            borderRadius: 1,
            borderLeft: 3,
            borderColor: msg.role === 'user' ? 'primary.main' : msg.role === 'assistant' ? 'grey.400' : 'warning.main',
          }}
        >
          <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: 9 }}>
            {msg.role}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 11, whiteSpace: 'pre-wrap', mt: 0.5 }}>
            {msg.content}
          </Typography>
        </Box>
      ))}
      <Section title="State Info">
        <KV label="Turn count" value={state.turn_count} />
        <KV label="Thread ID" value={state.thread_id} />
        <KV label="Agent ID" value={state.agent_id} />
        {state.collected_data && Object.keys(state.collected_data).length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
              Collected Data:
            </Typography>
            {Object.entries(state.collected_data).map(([key, value]) => (
              <KV key={key} label={key} value={JSON.stringify(value)} />
            ))}
          </>
        )}
      </Section>
    </Stack>
  );
}

// =============================================================================
// SHARED
// =============================================================================

function Section({ title, children }) {
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

function KV({ label, value }) {
  return (
    <Typography variant="body2" sx={{ fontSize: 11 }}>
      <Box component="span" sx={{ color: 'text.secondary' }}>{label}:</Box> {value}
    </Typography>
  );
}

function MessageBubble({ message }) {
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
