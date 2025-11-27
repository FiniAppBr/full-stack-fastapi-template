import { Helmet } from 'react-helmet-async';

import { EntitiesMainView } from 'src/sections/entities-v2';

// ----------------------------------------------------------------------

export default function EntitiesV2Page() {
  return (
    <>
      <Helmet>
        <title>Entidades | ConnectAI</title>
      </Helmet>

      <EntitiesMainView />
    </>
  );
}
