import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function RawDataTab() {
  const [chunks, setChunks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogChunk, setLinkDialogChunk] = useState(null);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const response = await axios.get(endpoints.neoAgents.list);
      setAgents(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  }, []);

  // Fetch document chunks only (category='document')
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 200, category: 'document' };
      const response = await axios.get(endpoints.knowledge.list, { params });
      setChunks(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch chunks:', error);
      setChunks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter chunks by search
  const filteredChunks = useMemo(() => {
    if (!searchQuery) return chunks;
    const query = searchQuery.toLowerCase();
    return chunks.filter(
      (chunk) =>
        (chunk.title && chunk.title.toLowerCase().includes(query)) ||
        chunk.content.toLowerCase().includes(query)
    );
  }, [chunks, searchQuery]);

  // Group chunks by source file (using title prefix)
  const groupedBySource = useMemo(() => {
    const groups = {};
    filteredChunks.forEach((chunk) => {
      // Extract source from title (e.g., "filename.txt - Part 1: ...")
      const match = chunk.title?.match(/^(.+?)\s*-\s*Part \d+/);
      const source = match ? match[1] : chunk.title || 'Sem título';
      if (!groups[source]) {
        groups[source] = [];
      }
      groups[source].push(chunk);
    });
    return groups;
  }, [filteredChunks]);

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'document');

    try {
      setUploading(true);
      setUploadProgress(0);

      const response = await axios.post(endpoints.knowledge.upload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(progress);
        },
      });

      await fetchData();
      alert(`Documento processado! ${response.data.chunks_created} chunks criados.`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.detail || 'Erro ao processar documento');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    handleFileUpload(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle chunk delete
  const handleDeleteChunk = async (chunkId) => {
    if (!window.confirm('Tem certeza que deseja excluir este chunk?')) return;

    try {
      await axios.delete(endpoints.knowledge.delete(chunkId));
      await fetchData();
    } catch (error) {
      console.error('Failed to delete chunk:', error);
      alert('Erro ao excluir chunk');
    }
  };

  // Handle link/unlink
  const handleOpenLinkDialog = (chunk) => {
    setLinkDialogChunk(chunk);
    setLinkDialogOpen(true);
  };

  const handleCloseLinkDialog = () => {
    setLinkDialogOpen(false);
    setLinkDialogChunk(null);
  };

  const handleToggleAgent = async (agentSlug, isCurrentlyLinked) => {
    if (!linkDialogChunk) return;

    try {
      if (isCurrentlyLinked) {
        await axios.post(endpoints.knowledge.unlink(linkDialogChunk.id), { agent_id: agentSlug });
      } else {
        await axios.post(endpoints.knowledge.link(linkDialogChunk.id), { agent_id: agentSlug });
      }
      // Refresh data
      await fetchData();
      // Update local state
      const updated = chunks.find((c) => c.id === linkDialogChunk.id);
      if (updated) {
        setLinkDialogChunk(updated);
      }
    } catch (error) {
      console.error('Failed to toggle agent link:', error);
      alert('Erro ao atualizar vinculação');
    }
  };

  // Stats
  const stats = useMemo(() => {
    const totalChunks = chunks.length;
    const totalTokens = chunks.reduce((acc, c) => acc + (c.token_count || 0), 0);
    const sources = Object.keys(groupedBySource).length;
    return { totalChunks, totalTokens, sources };
  }, [chunks, groupedBySource]);

  // Get agent name by slug
  const getAgentName = (agentSlug) => {
    if (!agentSlug) return agentSlug;
    const agent = agents.find((a) => a.name?.toLowerCase() === agentSlug || a.id === agentSlug);
    return agent?.name || agentSlug;
  };

  // Get linked agents display
  const getLinkedAgentsDisplay = (chunk) => {
    const linked = chunk.linked_agents || [];
    const legacy = chunk.agent_id;

    // Combine legacy and linked_agents, remove duplicates
    const allAgents = [...new Set([...linked, legacy].filter(Boolean))];

    if (allAgents.length === 0) return 'Nenhum agente';
    if (allAgents.length === 1) return getAgentName(allAgents[0]);
    return `${allAgents.length} agentes`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  const hasData = chunks.length > 0;

  return (
    <>
      {/* Upload Area */}
      <Box sx={{ mb: 3 }}>
        <Box
          component="label"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            borderRadius: 2,
            border: '2px dashed',
            borderColor: dragActive ? 'primary.main' : 'divider',
            bgcolor: dragActive ? 'primary.lighter' : 'background.neutral',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'primary.lighter',
            },
          }}
        >
          <input
            type="file"
            accept=".txt,.md"
            hidden
            onChange={handleInputChange}
            disabled={uploading}
          />

          {uploading ? (
            <Stack spacing={2} alignItems="center" sx={{ width: '100%', maxWidth: 300 }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                Processando documento...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{ width: '100%', borderRadius: 1 }}
              />
            </Stack>
          ) : (
            <>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.lighter',
                  mb: 2,
                }}
              >
                <Iconify icon="solar:cloud-upload-bold-duotone" width={40} sx={{ color: 'primary.main' }} />
              </Box>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Adicionar documento
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
                Arraste um arquivo aqui ou clique para selecionar
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Formatos aceitos: .txt, .md
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Stats */}
      {hasData && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(3, 1fr)',
            mb: 3,
          }}
        >
          {[
            { icon: 'solar:document-bold-duotone', color: 'primary.main', value: stats.sources, label: 'Documentos' },
            { icon: 'solar:layers-bold-duotone', color: 'info.main', value: stats.totalChunks, label: 'Chunks' },
            { icon: 'solar:hashtag-bold', color: 'warning.main', value: stats.totalTokens.toLocaleString(), label: 'Tokens' },
          ].map((stat) => (
            <Box
              key={stat.label}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
              }}
            >
              <Iconify icon={stat.icon} width={24} sx={{ color: stat.color, mb: 0.5 }} />
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{stat.value}</Typography>
              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Search */}
      {hasData && (
        <>
          <Divider sx={{ mb: 3 }} />

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">
              Seus documentos
            </Typography>
            <TextField
              size="small"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="solar:magnifer-bold" width={18} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          {/* Grouped by source */}
          <Stack spacing={2}>
            {Object.entries(groupedBySource).map(([source, sourceChunks]) => (
              <Box
                key={source}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#607D8B15',
                      }}
                    >
                      <Iconify icon="solar:document-text-bold" width={18} sx={{ color: '#607D8B' }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">{source}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sourceChunks.length} chunks • {sourceChunks.reduce((a, c) => a + (c.token_count || 0), 0)} tokens
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      size="small"
                      label={getLinkedAgentsDisplay(sourceChunks[0])}
                      variant="soft"
                      color="primary"
                      onClick={() => handleOpenLinkDialog(sourceChunks[0])}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Stack>
                </Stack>

                {/* Show first few chunks */}
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {sourceChunks.slice(0, 3).map((chunk) => (
                    <Box
                      key={chunk.id}
                      onClick={() => setSelectedChunk(chunk)}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'background.neutral',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {chunk.content.substring(0, 100)}...
                      </Typography>
                    </Box>
                  ))}
                  {sourceChunks.length > 3 && (
                    <Typography variant="caption" color="text.disabled" sx={{ pl: 1 }}>
                      +{sourceChunks.length - 3} mais chunks
                    </Typography>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>

          {Object.keys(groupedBySource).length === 0 && searchQuery && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Nenhum documento encontrado para &quot;{searchQuery}&quot;
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Empty state */}
      {!hasData && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Você ainda não tem documentos. Faça upload do seu primeiro arquivo acima!
          </Typography>
        </Box>
      )}

      {/* Chunk Detail Dialog */}
      <Dialog
        open={!!selectedChunk}
        onClose={() => setSelectedChunk(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedChunk && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" noWrap sx={{ maxWidth: 500 }}>
                  {selectedChunk.title || 'Chunk'}
                </Typography>
                <IconButton onClick={() => setSelectedChunk(null)} size="small">
                  <Iconify icon="eva:close-fill" />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label={`${selectedChunk.token_count || 0} tokens`} size="small" />
                  <Chip
                    label={getLinkedAgentsDisplay(selectedChunk)}
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setSelectedChunk(null);
                      handleOpenLinkDialog(selectedChunk);
                    }}
                    sx={{ cursor: 'pointer' }}
                  />
                  {selectedChunk.labels?.map((label) => (
                    <Chip key={label} label={label} size="small" variant="soft" />
                  ))}
                </Stack>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: 'background.neutral',
                    maxHeight: 400,
                    overflow: 'auto',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  >
                    {selectedChunk.content}
                  </Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                color="error"
                variant="soft"
                startIcon={<Iconify icon="solar:trash-bin-minimalistic-bold" />}
                onClick={() => {
                  handleDeleteChunk(selectedChunk.id);
                  setSelectedChunk(null);
                }}
              >
                Excluir
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Link Agents Dialog */}
      <Dialog
        open={linkDialogOpen}
        onClose={handleCloseLinkDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Vincular Agentes</Typography>
            <IconButton onClick={handleCloseLinkDialog} size="small">
              <Iconify icon="eva:close-fill" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {linkDialogChunk && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Selecione quais agentes terão acesso a este conteúdo:
              </Typography>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'background.neutral',
                  mb: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {linkDialogChunk.title || 'Chunk'}
                </Typography>
              </Box>

              <Stack spacing={1}>
                {/* Legacy agent_id as option */}
                {linkDialogChunk.agent_id && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: 'action.selected',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon="solar:user-bold" width={20} />
                      <Typography variant="body2">
                        {getAgentName(linkDialogChunk.agent_id)}
                      </Typography>
                    </Stack>
                    <Chip label="Original" size="small" variant="soft" color="default" />
                  </Box>
                )}

                {/* All agents with toggle */}
                {agents.map((agent) => {
                  const agentSlug = agent.name?.toLowerCase() || String(agent.id);
                  const isLinked = linkDialogChunk.linked_agents?.includes(agentSlug);
                  const isLegacy = linkDialogChunk.agent_id === agentSlug;

                  if (isLegacy) return null; // Already shown above

                  return (
                    <Box
                      key={agent.id}
                      onClick={() => handleToggleAgent(agentSlug, isLinked)}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: isLinked ? 'primary.main' : 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        bgcolor: isLinked ? 'primary.lighter' : 'transparent',
                        '&:hover': {
                          bgcolor: isLinked ? 'primary.light' : 'action.hover',
                        },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Checkbox
                          checked={isLinked}
                          size="small"
                          sx={{ p: 0 }}
                        />
                        <Typography variant="body2">{agent.name}</Typography>
                      </Stack>
                      {isLinked && (
                        <Iconify icon="solar:check-circle-bold" width={20} sx={{ color: 'primary.main' }} />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLinkDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
