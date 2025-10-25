import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { BuilderView } from 'src/sections/builder/builder-view';

// ----------------------------------------------------------------------

export default function AgentBuilderPage() {
  return (
    <>
      <Helmet>
        <title>{`Agent Builder - ${CONFIG.appName}`}</title>
      </Helmet>

      <BuilderView />
    </>
  );
}
