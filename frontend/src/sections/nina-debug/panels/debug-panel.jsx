import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Section, KV } from '../components/shared';

// ----------------------------------------------------------------------

export function DebugPanel({ turnDebug }) {
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

  // Pipeline nodes status
  const pipelineNodes = [
    { name: 'PREPROCESS', active: true, llm: false, detail: Object.keys(preprocessed || {}).length > 0 ? 'extracted' : 'pass' },
    { name: 'ASSEMBLE', active: true, llm: false, detail: `${debug?.assembled?.chunks?.length || 0} chunks` },
    { name: 'AGENT', active: agentCalls > 0, llm: true, detail: agentCalls > 0 ? `${agentCalls}x` : 'skip' },
    { name: 'TOOLS', active: toolCalls.length > 0, llm: false, detail: toolCalls.length > 0 ? `${toolCalls.length} calls` : 'skip' },
    { name: 'EXTRACT', active: true, llm: true, detail: Object.keys(extraction || {}).length > 0 ? 'found' : 'none' },
    { name: 'GENERATE', active: true, llm: true, detail: generateCalls > 1 ? `${generateCalls}x retry` : '1x' },
    { name: 'VALIDATE', active: validateCalls > 0, llm: true, detail: validation.passed ? 'pass' : validation.issues?.length > 0 ? 'fail' : 'skip' },
    { name: 'POST', active: true, llm: false, detail: 'done' },
  ];

  return (
    <Stack spacing={1.5}>
      {/* Pipeline Flow Visualization */}
      <Section title="Pipeline Flow">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
          {pipelineNodes.map((node, idx) => (
            <Box key={node.name} sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: node.active ? (node.llm ? 'primary.lighter' : 'success.lighter') : 'grey.200',
                  border: 1,
                  borderColor: node.active ? (node.llm ? 'primary.main' : 'success.main') : 'grey.400',
                  opacity: node.active ? 1 : 0.5,
                }}
              >
                <Typography sx={{ fontSize: 8, fontWeight: 600, color: node.active ? 'text.primary' : 'text.disabled' }}>
                  {node.name}
                </Typography>
                <Typography sx={{ fontSize: 7, color: 'text.secondary' }}>{node.detail}</Typography>
              </Box>
              {idx < pipelineNodes.length - 1 && (
                <Typography sx={{ mx: 0.25, fontSize: 10, color: 'text.disabled' }}>→</Typography>
              )}
            </Box>
          ))}
        </Box>
        <Typography variant="caption" sx={{ fontSize: 8, color: 'text.secondary', display: 'block', mt: 0.5 }}>
          Blue = LLM call, Green = no LLM, Gray = skipped
        </Typography>
      </Section>

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
