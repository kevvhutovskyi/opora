import { useBase } from '@airtable/blocks/ui';

interface ProductFields {
  model: string;
  manufacturer: string;
  description: string;
}

export function useProductMutations() {
  const base = useBase();

  // Initialize tables safely
  const productsTable = base.getTableByNameIfExists('Товари');
  const popularProductsTable = base.getTableByNameIfExists('Найпопулярніші Товари');
  const specsTable = base.getTableByNameIfExists('Характеристики');
  const prodSpecsTable = base.getTableByNameIfExists('Товари/Характеристики');

  const saveProduct = async (
    productId: string | null,
    fields: ProductFields
  ): Promise<string> => {
    if (!productsTable) throw new Error('Таблиця "Товари" не знайдена');

    const airtableFields = {
      'Модель': fields.model,
      'Виробник': fields.manufacturer,
      'Опис': fields.description,
    };

    if (productId) {
      await productsTable.updateRecordAsync(productId, airtableFields);
      return productId;
    } else {
      const newRecordId = await productsTable.createRecordAsync(airtableFields);
      return newRecordId;
    }
  };

  const deleteProduct = async (productId: string): Promise<void> => {
    if (!productsTable) throw new Error('Таблиця "Товари" не знайдена');
    await productsTable.deleteRecordAsync(productId);
  };

  const togglePopularStatus = async (
    productId: string,
    popularRecordId: string | null
  ): Promise<void> => {
    if (!popularProductsTable) throw new Error('Таблиця "Найпопулярніші Товари" не знайдена');

    if (popularRecordId) {
      await popularProductsTable.deleteRecordAsync(popularRecordId);
    } else {
      await popularProductsTable.createRecordAsync({
        'Товари': [{ id: productId }],
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
      specIdToLink = await specsTable.createRecordAsync({ 'Значення': newSpecName });
    }

    if (!specIdToLink) throw new Error('Не вказана характеристика');

    await prodSpecsTable.createRecordAsync({
      'Товар': [{ id: productId }],
      'Характеристика': [{ id: specIdToLink }],
      'Значення': specValue,
    });
  };

  const removeProductSpec = async (prodSpecId: string): Promise<void> => {
    if (!prodSpecsTable) throw new Error('Таблиця "Товари/Характеристики" не знайдена');
    await prodSpecsTable.deleteRecordAsync(prodSpecId);
  };

  return {
    saveProduct,
    deleteProduct,
    togglePopularStatus,
    addProductSpec,
    removeProductSpec,
  };
}