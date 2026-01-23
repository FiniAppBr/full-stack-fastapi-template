import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { MessageBubble } from '../components/shared';
import {
  RAGPanel,
  DebugPanel,
  ToolsPanel,
  ConfigPanel,
  PromptPanel,
  HistoryPanel,
  EntitiesPanel,
} from '../panels';

// ----------------------------------------------------------------------

const DEBUG_CHAT_ENDPOINT = '/api/v1/chat/debug/chat';
const DEBUG_AGENT_ENDPOINT = '/api/v1/chat/debug/agent';

// ----------------------------------------------------------------------

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
      alert(`Failed to save: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardContent maxWidth={false} sx={{ p: 2 }}>
      {/* Header */}
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
                alert(`Export failed: ${error.message}`);
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
                    agentId={selectedAgentId}
                    editMode={editMode}
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
