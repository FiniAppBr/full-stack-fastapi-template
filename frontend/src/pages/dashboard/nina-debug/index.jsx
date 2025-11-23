import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { NinaDebugView } from 'src/sections/nina-debug';

// ----------------------------------------------------------------------

const metadata = { title: `Nina Debug | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <NinaDebugView />
    </>
  );
}
