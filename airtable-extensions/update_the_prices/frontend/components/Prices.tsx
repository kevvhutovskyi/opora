import { useBase, useGlobalConfig, useRecords } from '@airtable/blocks/ui';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  FormField,
  Input,
  Select,
  Heading,
} from '@airtable/blocks/ui';
import { Table, Record as AirtableRecord } from '@airtable/blocks/models';

type PricesProps = {
  navigate: (page: 'json' | 'prices') => void;
};

// Визначаємо три режими роботи
type PricingMode = 'discount' | 'subtractPrice' | 'setPrice';

export default function Prices({ navigate }: PricesProps): JSX.Element {
  const base = useBase();
  const globalConfig = useGlobalConfig();

  // Отримуємо всі таблиці бази (Стільці, Столи тощо)
  const tables = base.tables;
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || '');

  // Отримуємо вибрану таблицю та її записи
  const table = base.getTableByIdIfExists(selectedTableId) as Table | null;
  const records = useRecords(table);

  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('');
  
  // Стани для різних режимів
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [subtractAmount, setSubtractAmount] = useState<number>(0);
  const [newPrice, setNewPrice] = useState<number>(0);

  useEffect(() => {
    const schema = base.tables.map(table => ({
        tableName: table.name,
        fields: table.fields.map(field => ({
            name: field.name,
            type: field.type,
            description: field.description || 'немає опису'
        }))
    }));

    globalConfig.setAsync('schema', schema);
}, [base]);

  // Поточний режим (за замовчуванням — знижка у відсотках)
  const [mode, setMode] = useState<PricingMode>('discount');

  // Динамічно збираємо список унікальних виробників для вибраної таблиці
  const manufacturers = useMemo<string[]>(() => {
    if (!records) return [];
    const set = new Set<string>();
    records.forEach(r => {
      const manufacturer = r.getCellValueAsString('Виробник');
      if (manufacturer) set.add(manufacturer);
    });
    return Array.from(set).sort();
  }, [records]);

  // Скидаємо вибраного виробника при зміні таблиці
  const handleTableChange = (val: string | null) => {
    setSelectedTableId(val ?? '');
    setSelectedManufacturer('');
  };

  const applyChanges = async (): Promise<void> => {
    if (!table || !records) return;

    // Валідація введення залежно від режиму
    if (mode === 'discount' && !discountPercent) {
      alert('Введіть відсоток знижки');
      return;
    }
    if (mode === 'subtractPrice' && !subtractAmount) {
      alert('Введіть суму, на яку хочете зменшити ціну');
      return;
    }
    if (mode === 'setPrice' && !newPrice) {
      alert('Введіть нову ціну з нуля');
      return;
    }

    const updates: { id: string; fields: { [key: string]: any } }[] = [];

    records.forEach(record => {
      const manufacturer = record.getCellValueAsString('Виробник');
      const currentPrice = record.getCellValue('Ціна') as number | null;
      
      const manufacturerMatch = selectedManufacturer === '' || manufacturer === selectedManufacturer;

      if (!manufacturerMatch) return;

      // 1. Режим: Дати знижку у відсотках
      if (mode === 'discount') {
        updates.push({
          id: record.id,
          fields: {
            'Знижка (Відсоток)': discountPercent / 100,
          },
        });
      }

      // 2. Режим: Зменшити поточну ціну на фіксовану суму
      if (mode === 'subtractPrice') {
        if (currentPrice === null) return; // Пропускаємо товари без ціни
        const calculatedPrice = currentPrice - subtractAmount;
        updates.push({
          id: record.id,
          fields: {
            'Ціна': Number(Math.max(0, calculatedPrice).toFixed(2)), // Ціна не може бути меншою за 0
          },
        });
      }

      // 3. Режим: Вказати нову ціну з нуля
      if (mode === 'setPrice') {
        updates.push({
          id: record.id,
          fields: {
            'Ціна': Number(newPrice.toFixed(2)),
          },
        });
      }
    });

    if (updates.length === 0) {
      alert('Не знайдено товарів для оновлення.');
      return;
    }

    // Оновлюємо пачками по 50 штук (ліміт Airtable API)
    const totalUpdates = updates.length;
    while (updates.length > 0) {
      await table.updateRecordsAsync(updates.slice(0, 50));
      updates.splice(0, 50);
    }
    
    // Скидаємо числові поля після виконання
    setDiscountPercent(0);
    setSubtractAmount(0);
    setNewPrice(0);
  };

  return (
    <Box padding={3}>
      <Heading marginBottom={3}>Інструмент ціноутворення</Heading>

      <Button
        marginBottom={3}
        onClick={() => navigate('json')}
      >
        JSON Документ
      </Button>

      {/* Вибір режиму через Select замість Switch */}
      <FormField label="Оберіть дію з ціною">
        <Select
          options={[
            { value: 'discount', label: 'Встановити знижку (%)' },
            { value: 'subtractPrice', label: 'Зменшити ціну на суму (-)' },
            { value: 'setPrice', label: 'Встановити нову ціну з нуля (=)' },
          ]}
          value={mode}
          onChange={(val) => setMode(val as PricingMode)}
        />
      </FormField>

      <FormField label="Категорія товарів (Таблиця)">
        <Select
          options={tables.map(t => ({ value: t.id, label: t.name }))}
          value={selectedTableId}
          onChange={handleTableChange}
        />
      </FormField>

      <FormField label="Виробник">
        <Select
          options={[
            { value: '', label: 'Всі виробники у цій категорії' },
            ...manufacturers.map(m => ({ value: m, label: m })),
          ]}
          value={selectedManufacturer}
          onChange={(val: string | null) =>
            setSelectedManufacturer(val ?? '')
          }
          disabled={!selectedTableId}
        />
      </FormField>

      {/* Рендеримо інпут залежно від обраного режиму */}
      {mode === 'discount' && (
        <FormField label="Знижка (введіть відсоток, наприклад: 15)">
          <Input
            type="number"
            value={discountPercent.toString()}
            onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
          />
        </FormField>
      )}

      {mode === 'subtractPrice' && (
        <FormField label="Зменшити ціну кожного товару на (сума):">
          <Input
            type="number"
            value={subtractAmount.toString()}
            onChange={(e) => setSubtractAmount(parseFloat(e.target.value) || 0)}
          />
        </FormField>
      )}

      {mode === 'setPrice' && (
        <FormField label="Нова фіксована ціна для всіх товарів:">
          <Input
            type="number"
            value={newPrice.toString()}
            onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
          />
        </FormField>
      )}

      <Button
        variant="primary"
        onClick={applyChanges}
        disabled={!selectedTableId}
        marginTop={2}
      >
        Застосувати зміни
      </Button>
    </Box>
  );
}