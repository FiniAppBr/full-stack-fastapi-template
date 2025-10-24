import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { FlowchartBuilderView } from 'src/sections/agent/view';

// ----------------------------------------------------------------------

const metadata = { title: `Flowchart Builder | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <FlowchartBuilderView />
    </>
  );
}
