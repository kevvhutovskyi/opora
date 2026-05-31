import { useBase, useRecords } from '@airtable/blocks/ui';
import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Heading,
    FormField,
    Select,
    Text,
    colors
} from '@airtable/blocks/ui';
import { Table, Record as AirtableRecord } from '@airtable/blocks/models';

type JsonUpdaterProps = {
    navigate: (page: 'json' | 'prices') => void;
};

export default function JsonUpdater({ navigate }: JsonUpdaterProps): JSX.Element {
    const base = useBase();
    
    const tables = base.tables;
    const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || '');
    
    const table = base.getTableByIdIfExists(selectedTableId) as Table | null;
    const records = useRecords(table);

    const [jsonText, setJsonText] = useState('');
    // Стан для збереження розпарсеного масиву з textarea для прев'ю
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Слідкуємо за зміною тексту в textarea та оновлюємо прев'ю майбутніх товарів
    useEffect(() => {
        if (!jsonText.trim()) {
            setParsedItems([]);
            setJsonError(null);
            return;
        }

        try {
            const data = JSON.parse(jsonText);
            if (Array.isArray(data)) {
                setParsedItems(data);
                setJsonError(null);
            } else {
                setParsedItems([]);
                setJsonError('JSON має бути масивом об\'єктів []');
            }
        } catch (e) {
            setParsedItems([]);
            // Не показуємо помилку відразу, поки користувач тільки друкує
            if (jsonText.endsWith('}') || jsonText.endsWith(']')) {
                setJsonError('Неправильний формат JSON (перевірте коми та дужки)');
            }
        }
    }, [jsonText]);

    // --- ГЕНЕРАЦІЯ JSON ДЛЯ ЗАВАНТАЖЕННЯ ---
    const generateJson = () => {
        if (!table || !records) return;

        const data = records.map(record => {
            const item: any = {};
            
            item['Модель'] = record.getCellValueAsString('Модель');
            item['Виробник'] = record.getCellValueAsString('Виробник');
            item['Наявність'] = Boolean(record.getCellValue('Наявність'));
            item['Ціна'] = record.getCellValue('Ціна');
            item['Знижка (Відсоток)'] = record.getCellValue('Знижка (Відсоток)');
            
            item['Ціна після знижки'] = record.getCellValue('Ціна після знижки');
            item['Знижка (Ціна)'] = record.getCellValue('Знижка (Ціна)');
            item['Сума знижок'] = record.getCellValueAsString('Сума знижок');

            if (table.getFieldByNameIfExists('Колір ніжок (Назва)')) {
                item['Колір ніжок (Назва)'] = record.getCellValueAsString('Колір ніжок (Назва)');
                item['Колір ніжок (HEX)'] = record.getCellValueAsString('Колір ніжок (HEX)');
                item['Колір сидіння (Назва)'] = record.getCellValueAsString('Колір сидіння (Назва)');
                item['Колір сидіння (HEX)'] = record.getCellValueAsString('Колір сидіння (HEX)');
            }

            return item;
        });

        setJsonText(JSON.stringify(data, null, 2));
    };

    // --- СИНХРОНІЗАЦІЯ JSON В AIRTABLE ---
    const applyJson = async () => {
        if (!table || parsedItems.length === 0) return;

        const query = await table.selectRecordsAsync();
        const updates: { id: string; fields: any }[] = [];
        const creates: { fields: any }[] = [];

        for (const item of parsedItems) {
            const existing = query.records.find(r =>
                r.getCellValueAsString('Модель') === item['Модель'] &&
                r.getCellValueAsString('Виробник') === item['Виробник']
            );

            const fields: any = {};
            
            if (item['Модель'] !== undefined) fields['Модель'] = item['Модель'];
            if (item['Виробник'] !== undefined) fields['Виробник'] = item['Виробник'];
            if (item['Наявність'] !== undefined) fields['Наявність'] = Boolean(item['Наявність']);
            if (item['Ціна'] !== undefined) fields['Ціна'] = Number(item['Ціна']);
            if (item['Знижка (Відсоток)'] !== undefined) fields['Знижка (Відсоток)'] = Number(item['Знижка (Відсоток)']);

            if (table.getFieldByNameIfExists('Колір ніжок (Назва)')) {
                if (item['Колір ніжок (Назва)'] !== undefined) fields['Колір ніжок (Назва)'] = item['Колір ніжок (Назва)'];
                if (item['Колір ніжок (HEX)'] !== undefined) fields['Колір ніжок (HEX)'] = item['Колір ніжок (HEX)'];
                if (item['Колір сидіння (Назва)'] !== undefined) fields['Колір сидіння (Назва)'] = item['Колір сидіння (Назва)'];
                if (item['Колір сидіння (HEX)'] !== undefined) fields['Колір сидіння (HEX)'] = item['Колір сидіння (HEX)'];
            }

            if (existing) {
                updates.push({ id: existing.id, fields });
            } else {
                creates.push({ fields });
            }
        }

        const chunk = (arr: any[], size: number) =>
            arr.reduce((acc, _, i) =>
                i % size ? acc : [...acc, arr.slice(i, i + size)], []);

        for (const group of chunk(updates, 50)) {
            await table.updateRecordsAsync(group);
        }

        for (const group of chunk(creates, 50)) {
            await table.createRecordsAsync(group);
        }

        alert(`Синхронізація завершена! Оновлено: ${updates.length}, Створено: ${creates.length}`);
        setJsonText('');
    };

    return (
        <Box display="flex" flexDirection="row" height="100vh" overflow="hidden">
            
            {/* ЛІВА ПАНЕЛЬ: КЕРУВАННЯ ТА ПРЕВ'Ю ВСТАВКИ */}
            <Box flex="1" padding={3} overflowY="auto" borderRight="thick" borderColor={colors.GRAY_LIGHT_2}>
                <Heading marginBottom={3}>Управління даними (JSON)</Heading>

                <Button marginBottom={3} onClick={() => navigate('prices')}>
                    ← Назад до інструменту цін
                </Button>

                <FormField label="Оберіть таблицю (Категорію)">
                    <Select
                        options={tables.map(t => ({ value: t.id, label: t.name }))}
                        value={selectedTableId}
                        onChange={(val) => {
                            setSelectedTableId(val.toString() ?? '');
                            setJsonText('');
                        }}
                    />
                </FormField>

                <Button marginBottom={3} onClick={generateJson}>
                    Згенерувати JSON поточних товарів
                </Button>

                <FormField label="Вставте JSON Документ для імпорту/синхронізації">
                    <textarea
                        value={jsonText}
                        onChange={(e) => setJsonText(e.target.value)}
                        placeholder="Вставте сюди ваш масив JSON..."
                        rows={10}
                        style={{ width: '100%', fontFamily: 'monospace', padding: '8px', marginBottom: '4px' }}
                    />
                    {jsonError && (
                        <Text textColor={colors.RED_DARK_1} size="small">
                            ⚠️ {jsonError}
                        </Text>
                    )}
                </FormField>

                <Button 
                    variant="primary" 
                    onClick={applyJson} 
                    disabled={!parsedItems.length || !!jsonError}
                    marginBottom={4}
                >
                    Синхронізувати: {parsedItems.length} тов.
                </Button>

                {/* --- НОВИЙ БЛОК: ПОПЕРЕДНІЙ ПЕРЕГЛЯД ДАНИХ З TEXTAREA --- */}
                {parsedItems.length > 0 && (
                    <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={3} marginTop={2}>
                        <Heading size="small" marginBottom={2} textColor={colors.BLUE_DARK_1}>
                            📋 Буде додано / оновлено через JSON ({parsedItems.length}):
                        </Heading>
                        
                        {parsedItems.map((item, index) => (
                            <Box 
                                key={index}
                                backgroundColor={colors.BLUE_LIGHT_2} 
                                padding={2} 
                                marginBottom={2} 
                                borderRadius="medium"
                                borderLeft="thick"
                                borderColor={colors.BLUE_DARK_1}
                            >
                                <Text size="small">
                                    #{index + 1} {item['Модель'] || 'Без моделі'} — {item['Виробник'] || 'Без виробника'}
                                </Text>
                                <Box display="flex" justifyContent="space-between" marginTop={1}>
                                    <Text size="small">Ціна: <strong>{item['Ціна'] ?? '—'} ₴</strong></Text>
                                    <Text size="small">Знижка: <strong>{item['Знижка (Відсоток)'] ?? 0}%</strong></Text>
                                    <Text size="small">
                                        Статус: <span style={{ color: item['Наявність'] ? 'green' : 'red', fontWeight: 'bold' }}>
                                            {item['Наявність'] ? 'В наявності' : 'Немає'}
                                        </span>
                                    </Text>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* ПРАВА ПАНЕЛЬ: ЖИВИЙ СПИСОК З БАЗИ (БЕЗ ЗМІН) */}
            <Box flex="1" padding={3} overflowY="auto" backgroundColor={colors.GRAY_LIGHT_1}>
                <Heading size="small" marginBottom={3}>
                    Поточний склад в Airtable: {table?.name || '—'} ({records?.length || 0})
                </Heading>
                
                {records?.map((record: AirtableRecord) => (
                    <Box 
                        key={record.id} 
                        backgroundColor="white" 
                        padding={3} 
                        marginBottom={3} 
                        borderRadius="large" 
                        boxShadow="0 1px 3px rgba(0,0,0,0.1)"
                    >
                        <Heading size="xsmall" marginBottom={1}>
                            {record.getCellValueAsString('Модель') || 'Модель не вказана'}
                        </Heading>
                        <Text textColor="light">Виробник: <strong>{record.getCellValueAsString('Виробник') || '—'}</strong></Text>
                        <Text textColor="light">
                            Статус: <strong style={{ color: record.getCellValue('Наявність') ? 'green' : 'red' }}>
                                {record.getCellValue('Наявність') ? 'В наявності' : 'Немає в наявності'}
                            </strong>
                        </Text>
                        
                        <Box display="flex" justifyContent="space-between" marginTop={2} borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={2}>
                            <Box>
                                <Text size="small" textColor="light">Базова ціна:</Text>
                                <Text>{record.getCellValueAsString('Ціна')} ₴</Text>
                            </Box>
                            <Box>
                                <Text size="small" textColor="light">Знижка:</Text>
                                <Text>{record.getCellValueAsString('Знижка (Відсоток)') || '0'}</Text>
                            </Box>
                            <Box>
                                <Text size="small" textColor="light">Зі знижкою:</Text>
                                <Text textColor={colors.GREEN_DARK_1}>
                                    {record.getCellValueAsString('Ціна після знижки')} ₴
                                </Text>
                            </Box>
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}