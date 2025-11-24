import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { NeoAgentNewEditForm } from 'src/sections/neo-agent';

// ----------------------------------------------------------------------

const metadata = { title: `Novo Agente - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <NeoAgentNewEditForm />
    </>
  );
}
