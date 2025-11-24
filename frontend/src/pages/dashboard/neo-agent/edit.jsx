import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { NeoAgentNewEditForm } from 'src/sections/neo-agent';

// ----------------------------------------------------------------------

const metadata = { title: `Editar Agente - ${CONFIG.site.name}` };

export default function Page() {
  const { id } = useParams();

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <NeoAgentNewEditForm agentId={id} />
    </>
  );
}
