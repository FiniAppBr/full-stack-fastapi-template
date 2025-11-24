import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ConversationReplayView } from 'src/sections/conversation-replay';

// ----------------------------------------------------------------------

const metadata = { title: `Histórico de Conversas | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <ConversationReplayView />
    </>
  );
}
