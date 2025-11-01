import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AgentListView } from 'src/sections/builder/agent-list-view';

// ----------------------------------------------------------------------

export default function AgentListPage() {
  return (
    <>
      <Helmet>
        <title>{`Agents - ${CONFIG.appName}`}</title>
      </Helmet>

      <AgentListView />
    </>
  );
}
