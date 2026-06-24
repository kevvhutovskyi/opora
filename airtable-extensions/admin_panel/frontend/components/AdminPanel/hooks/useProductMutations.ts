import { useBase } from '@airtable/blocks/ui';
import { FIELDS, TABLES } from '../constants';
import { toLinks } from '../utils';

interface ProductFields {
  model: string;
  catalog: string;
  description: string;
  visible: boolean;
}

export function useProductMutations() {
  const base = useBase();

  const productsTable = base.getTableByNameIfExists(TABLES.products);
  const popularProductsTable = base.getTableByNameIfExists(TABLES.popularProducts);
  const specsTable = base.getTableByNameIfExists(TABLES.specs);
  const prodSpecsTable = base.getTableByNameIfExists(TABLES.productSpecs);

  const saveProduct = async (
    productId: string | null,
    fields: ProductFields
  ): Promise<string> => {
    if (!productsTable) throw new Error(`Таблиця "${TABLES.products}" не знайдена`);

    const airtableFields = {
      [FIELDS.product.model]: fields.model,
      [FIELDS.product.catalog]: fields.catalog,
      [FIELDS.product.description]: fields.description,
      [FIELDS.product.visible]: fields.visible,
    };

    if (productId) {
      await productsTable.updateRecordAsync(productId, airtableFields);
      return productId;
    }
    return productsTable.createRecordAsync(airtableFields);
  };

  const deleteProduct = async (productId: string): Promise<void> => {
    if (!productsTable) throw new Error(`Таблиця "${TABLES.products}" не знайдена`);
    await productsTable.deleteRecordAsync(productId);
  };

  const togglePopularStatus = async (
    productId: string,
    popularRecordId: string | null
  ): Promise<void> => {
    if (!popularProductsTable) throw new Error(`Таблиця "${TABLES.popularProducts}" не знайдена`);

    if (popularRecordId) {
      await popularProductsTable.deleteRecordAsync(popularRecordId);
    } else {
      await popularProductsTable.createRecordAsync({
        [FIELDS.popular.products]: toLinks([productId]),
      });
    }
  };

  const addProductSpec = async (
    productId: string,
    specValue: string,
    selectedSpecId: string,
    newSpecName: string
  ): Promise<void> => {
    if (!prodSpecsTable || !specsTable) throw new Error('Таблиці характеристик не знайдені');

    let specIdToLink = selectedSpecId;

    if (newSpecName) {
      specIdToLink = await specsTable.createRecordAsync({ [FIELDS.spec.name]: newSpecName });
    }

    if (!specIdToLink) throw new Error('Не вказана характеристика');

    await prodSpecsTable.createRecordAsync({
      [FIELDS.productSpec.product]: toLinks([productId]),
      [FIELDS.productSpec.spec]: toLinks([specIdToLink]),
      [FIELDS.productSpec.value]: specValue,
    });
  };

  const removeProductSpec = async (prodSpecId: string): Promise<void> => {
    if (!prodSpecsTable) throw new Error(`Таблиця "${TABLES.productSpecs}" не знайдена`);
    await prodSpecsTable.deleteRecordAsync(prodSpecId);
  };

  // Перезаписує порядок linked-поля на товарі (варіації / характеристики).
  // Цей порядок storefront читає напряму — тож керує порядком на картці та сторінці товару.
  const reorderProductLinks = async (
    productId: string,
    fieldName: string,
    orderedIds: string[]
  ): Promise<void> => {
    if (!productsTable) throw new Error(`Таблиця "${TABLES.products}" не знайдена`);
    await productsTable.updateRecordAsync(productId, { [fieldName]: toLinks(orderedIds) });
  };

  return {
    saveProduct,
    deleteProduct,
    togglePopularStatus,
    addProductSpec,
    removeProductSpec,
    reorderProductLinks,
  };
}
