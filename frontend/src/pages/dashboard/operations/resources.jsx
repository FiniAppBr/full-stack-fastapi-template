import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ResourcesView } from 'src/sections/operations/resources-view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Recursos - ${CONFIG.site.name}`}</title>
      </Helmet>

      <ResourcesView />
    </>
  );
}
