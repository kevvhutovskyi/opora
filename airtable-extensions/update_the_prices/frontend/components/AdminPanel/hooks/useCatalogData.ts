import { useBase, useRecords } from '@airtable/blocks/ui';
import { FIELDS, TABLES } from '../constants';

export function useCatalogData() {
  const base = useBase();

  const productsTable = base.getTableByNameIfExists(TABLES.products);
  const variantsTable = base.getTableByNameIfExists(TABLES.variants);
  const optionsTable = base.getTableByNameIfExists(TABLES.options);
  const specsTable = base.getTableByNameIfExists(TABLES.specs);
  const prodSpecsTable = base.getTableByNameIfExists(TABLES.productSpecs);
  const popularProductsTable = base.getTableByNameIfExists(TABLES.popularProducts);
  const requestsTable = base.getTableByNameIfExists(TABLES.requests);

  const productsRecords = useRecords(productsTable);
  const variantsRecords = useRecords(variantsTable);
  const optionsRecords = useRecords(optionsTable);
  const specsRecords = useRecords(specsTable);
  const prodSpecsRecords = useRecords(prodSpecsTable);
  const popularProductsRecords = useRecords(popularProductsTable);
  const requestsRecords = useRecords(requestsTable, {
    sorts: [{ field: FIELDS.request.number, direction: 'desc' }],
  });

  return {
    isReady: !!productsTable, // Simple flag to check if the base loaded
    tables: {
      variantsTable,
      optionsTable,
      requestsTable,
    },
    records: {
      productsRecords,
      variantsRecords,
      optionsRecords,
      specsRecords,
      prodSpecsRecords,
      popularProductsRecords,
      requestsRecords,
    },
  };
}
