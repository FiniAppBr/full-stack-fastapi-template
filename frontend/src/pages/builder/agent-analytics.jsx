import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AgentAnalyticsView } from 'src/sections/builder/agent-analytics-view';

// ----------------------------------------------------------------------

const metadata = { title: `Agent Analytics | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AgentAnalyticsView />
    </>
  );
}
