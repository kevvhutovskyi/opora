import React, { useState } from 'react';
import { useBase, useRecords } from '@airtable/blocks/ui';
import { FIELDS, TABLES } from '../constants';

export interface JsonOption {
  group: string; // напр. "Колір / Декор"
  text: string;  // назва значення, напр. "Вишня"
  value: string; // hex або довільне значення, напр. "#000000"
}

export interface JsonVariant {
  art: string;   // артикул (SKU)
  price: number;
  options: JsonOption[];
}

export interface JsonCharacteristic {
  name: string;
  value: string;
}

export interface JsonProduct {
  name: string;
  description?: string;
  characteristics?: JsonCharacteristic[];
  variants: JsonVariant[];
}

// Дані на верхньому рівні — масив товарів.
export type JsonData = JsonProduct[];

type CreatedRecords = {
  products: string[];
  variants: string[];
  options: string[];
  specs: string[];
  prodSpecs: string[];
};

const EMPTY_CREATED: CreatedRecords = { products: [], variants: [], options: [], specs: [], prodSpecs: [] };

/** Уся логіка завантаження/скасування/очищення каталогу з JSON. UI лишається тонким. */
export function useJsonUpload() {
  const base = useBase();
  const [parsedData, setParsedData] = useState<JsonData | null>(null);
  const [parseError, setParseError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [createdRecords, setCreatedRecords] = useState<CreatedRecords>(EMPTY_CREATED);

  const productsTable = base.getTableByNameIfExists(TABLES.products);
  const variantsTable = base.getTableByNameIfExists(TABLES.variants);
  const optionsTable = base.getTableByNameIfExists(TABLES.options);
  const specsTable = base.getTableByNameIfExists(TABLES.specs);
  const prodSpecsTable = base.getTableByNameIfExists(TABLES.productSpecs);

  const allProducts = useRecords(productsTable);
  const allVariants = useRecords(variantsTable);
  const allOptions = useRecords(optionsTable);
  const allSpecs = useRecords(specsTable);
  const allProdSpecs = useRecords(prodSpecsTable);

  const totalDbRecords =
    (allProducts?.length || 0) +
    (allVariants?.length || 0) +
    (allOptions?.length || 0) +
    (allSpecs?.length || 0) +
    (allProdSpecs?.length || 0);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError('');
    setParsedData(null);
    setLog([]);
    setIsDone(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          throw new Error('Очікується масив товарів на верхньому рівні: [ { "name", "variants": [...] } ]');
        }
        setParsedData(json);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Invalid JSON');
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!parsedData || !productsTable || !variantsTable || !optionsTable || !specsTable || !prodSpecsTable) {
      alert('Таблиці не знайдені. Перевірте назви таблиць в базі.');
      return;
    }

    setIsUploading(true);
    setLog([]);

    const created: CreatedRecords = { products: [], variants: [], options: [], specs: [], prodSpecs: [] };

    // Каталоги унікальних записів: назва -> id (щоб не дублювати характеристики/опції).
    const specByName = new Map<string, string>();
    (allSpecs || []).forEach((r) => specByName.set(r.getCellValueAsString(FIELDS.spec.name), r.id));

    const optionByName = new Map<string, string>();
    (allOptions || []).forEach((r) => optionByName.set(r.getCellValueAsString(FIELDS.option.name), r.id));

    const getOrCreateSpec = async (name: string): Promise<string> => {
      const existing = specByName.get(name);
      if (existing) return existing;
      const id = await specsTable.createRecordAsync({ [FIELDS.spec.name]: name });
      specByName.set(name, id);
      created.specs.push(id);
      return id;
    };

    const getOrCreateOption = async (name: string, value: string): Promise<string> => {
      const existing = optionByName.get(name);
      if (existing) return existing;
      const id = await optionsTable.createRecordAsync({ [FIELDS.option.name]: name, [FIELDS.option.value]: value });
      optionByName.set(name, id);
      created.options.push(id);
      return id;
    };

    try {
      for (const product of parsedData) {
        addLog(`[${product.name}] Створення товару...`);

        const productId = await productsTable.createRecordAsync({
          [FIELDS.product.name]: product.name,
          [FIELDS.product.model]: product.name,
          [FIELDS.product.visible]: true,
          [FIELDS.product.description]: product.description || '',
        });
        created.products.push(productId);
        addLog(`[${product.name}] Товар створено`);

        const characteristics = product.characteristics || [];
        for (const char of characteristics) {
          const specId = await getOrCreateSpec(char.name);
          const prodSpecId = await prodSpecsTable.createRecordAsync({
            [FIELDS.productSpec.product]: [{ id: productId }],
            [FIELDS.productSpec.spec]: [{ id: specId }],
            [FIELDS.productSpec.value]: char.value,
          });
          created.prodSpecs.push(prodSpecId);
        }
        if (characteristics.length > 0) {
          addLog(`[${product.name}] Характеристики додано (${characteristics.length})`);
        }

        let variantCount = 0;
        for (const variant of product.variants || []) {
          // Опції зберігають порядок із JSON; назва = "Група: Текст", значення = hex/текст.
          const optionIds: string[] = [];
          for (const opt of variant.options || []) {
            optionIds.push(await getOrCreateOption(`${opt.group}: ${opt.text}`, opt.value));
          }

          const variantId = await variantsTable.createRecordAsync({
            [FIELDS.variant.sku]: variant.art,
            [FIELDS.variant.price]: variant.price,
            [FIELDS.variant.inStock]: true,
            [FIELDS.variant.product]: [{ id: productId }],
            [FIELDS.variant.options]: optionIds.map((id) => ({ id })),
          });
          created.variants.push(variantId);
          variantCount++;
        }
        addLog(`[${product.name}] Варіації додано (${variantCount})`);
      }

      setCreatedRecords(created);
      addLog('--- Завантаження завершено! ---');
      setIsDone(true);
    } catch (error) {
      setCreatedRecords(created);
      addLog(`ПОМИЛКА: ${error instanceof Error ? error.message : String(error)}`);
      addLog('Натисніть «Скасувати», щоб видалити вже створені записи.');
      setIsDone(true);
    } finally {
      setIsUploading(false);
    }
  };

  // Airtable обмежує видалення до 50 записів за виклик — розбиваємо на партії.
  const deleteInBatches = async (table: ReturnType<typeof base.getTableByNameIfExists>, ids: string[]) => {
    if (!table || ids.length === 0) return;
    for (let i = 0; i < ids.length; i += 50) {
      await table.deleteRecordsAsync(ids.slice(i, i + 50));
    }
  };

  const handleUndo = async () => {
    if (!window.confirm('Видалити всі записи, створені під час цього завантаження?')) return;

    setIsUndoing(true);
    try {
      // Видаляємо у зворотному порядку залежностей: спочатку лінковані, батьки — останні.
      addLog('Скасування: видалення варіацій...');
      await deleteInBatches(variantsTable, createdRecords.variants);
      addLog('Скасування: видалення опцій...');
      await deleteInBatches(optionsTable, createdRecords.options);
      addLog('Скасування: видалення характеристик товарів...');
      await deleteInBatches(prodSpecsTable, createdRecords.prodSpecs);
      await deleteInBatches(specsTable, createdRecords.specs);
      addLog('Скасування: видалення товарів...');
      await deleteInBatches(productsTable, createdRecords.products);

      setCreatedRecords(EMPTY_CREATED);
      addLog('--- Зміни скасовано! ---');
      setIsDone(false);
    } catch (error) {
      addLog(`ПОМИЛКА скасування: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUndoing(false);
    }
  };

  const handleClearDb = async () => {
    if (!window.confirm(`Видалити ВСІ записи з каталогу (${totalDbRecords} шт.)? Це незворотно!`)) return;

    setIsUndoing(true);
    setLog([]);
    try {
      addLog(`Очищення: видалення варіацій (${allVariants?.length || 0})...`);
      await deleteInBatches(variantsTable, (allVariants || []).map((r) => r.id));
      addLog(`Очищення: видалення опцій (${allOptions?.length || 0})...`);
      await deleteInBatches(optionsTable, (allOptions || []).map((r) => r.id));
      addLog(`Очищення: видалення характеристик товарів (${allProdSpecs?.length || 0})...`);
      await deleteInBatches(prodSpecsTable, (allProdSpecs || []).map((r) => r.id));
      addLog(`Очищення: видалення довідника характеристик (${allSpecs?.length || 0})...`);
      await deleteInBatches(specsTable, (allSpecs || []).map((r) => r.id));
      addLog(`Очищення: видалення товарів (${allProducts?.length || 0})...`);
      await deleteInBatches(productsTable, (allProducts || []).map((r) => r.id));
      addLog('--- Базу очищено! ---');
    } catch (error) {
      addLog(`ПОМИЛКА: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUndoing(false);
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setLog([]);
    setIsDone(false);
    setParseError('');
  };

  return {
    parsedData,
    parseError,
    isUploading,
    isUndoing,
    isDone,
    log,
    totalDbRecords,
    handleFileChange,
    handleUpload,
    handleUndo,
    handleClearDb,
    handleReset,
  };
}
