import { useBase, useRecords } from '@airtable/blocks/ui';

export function useCatalogData() {
  const base = useBase();

  const productsTable = base.getTableByNameIfExists('Товари');
  const variantsTable = base.getTableByNameIfExists('Варіації Товарів');
  const optionsTable = base.getTableByNameIfExists('Опції');
  const specsTable = base.getTableByNameIfExists('Характеристики');
  const prodSpecsTable = base.getTableByNameIfExists('Товари/Характеристики');
  const popularProductsTable = base.getTableByNameIfExists('Найпопулярніші Товари');
  const requestsTable = base.getTableByNameIfExists('Запити');

  const productsRecords = useRecords(productsTable);
  const variantsRecords = useRecords(variantsTable);
  const optionsRecords = useRecords(optionsTable);
  const specsRecords = useRecords(specsTable);
  const prodSpecsRecords = useRecords(prodSpecsTable);
  const popularProductsRecords = useRecords(popularProductsTable);
  const requestsRecords = useRecords(requestsTable, {
    sorts: [{ field: 'Номер', direction: 'desc' }],
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
    }
  };
}