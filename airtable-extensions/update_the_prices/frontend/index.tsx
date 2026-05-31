import { initializeBlock } from '@airtable/blocks/ui';
import React, { useState } from 'react';
import Prices from './components/Prices';
import JsonUpdater from './components/JsonUploader';
import AdminPanel from './components/AdminPanel';

function App(): JSX.Element {
  const [page, setPage] = useState<'prices' | 'json' | 'admin_panel'>('admin_panel');

  return (
    <>
      {page === 'prices' && (
        <Prices navigate={setPage} />
      )}

      {page === 'json' && (
        <JsonUpdater navigate={setPage} />
      )}

      {page === 'admin_panel' && (
        <AdminPanel />
      )}
    </>
  );
}

initializeBlock(() => <App />);