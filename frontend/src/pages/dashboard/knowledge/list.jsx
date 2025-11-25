import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { KnowledgeListView } from 'src/sections/knowledge/knowledge-list-view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Conhecimento - ${CONFIG.site.name}`}</title>
      </Helmet>

      <KnowledgeListView />
    </>
  );
}
