import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AgentTemplatesView } from 'src/sections/builder/agent-templates-view';

// ----------------------------------------------------------------------

export default function AgentTemplatesPage() {
  return (
    <>
      <Helmet>
        <title>{`Novo Agente - ${CONFIG.appName}`}</title>
      </Helmet>

      <AgentTemplatesView />
    </>
  );
}
