import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ContactFieldsView } from 'src/sections/contacts/contact-fields-view';

// ----------------------------------------------------------------------

const metadata = { title: `Campos de Contato | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ContactFieldsView />
    </>
  );
}
