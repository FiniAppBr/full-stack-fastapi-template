import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { NeoAgentListView } from 'src/sections/neo-agent';

// ----------------------------------------------------------------------

const metadata = { title: `Neo Agents - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <NeoAgentListView />
    </>
  );
}
