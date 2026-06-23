import React, { useMemo, useState } from 'react';
import { Box, Text } from '@airtable/blocks/ui';
import { Record as AirtableRecord, Table } from '@airtable/blocks/models';
import { CATALOG_ITEMS, FIELDS, UI } from '../constants';
import { Card, Section } from './ui';

interface FiltersConfigProps {
  specsRecords: AirtableRecord[];
  specsTable: Table;
  optionsRecords: AirtableRecord[];
  optionFiltersTable: Table | null;
  optionFiltersRecords: AirtableRecord[] | null;
  onBack: () => void;
}

const toggleBtnStyle = (active: boolean, busy: boolean): React.CSSProperties => ({
  cursor: busy ? 'wait' : 'pointer',
  padding: '4px 12px',
  borderRadius: 6,
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  background: active ? UI.successBg : '#EEF1F4',
  color: active ? UI.successText : UI.textMuted,
  opacity: busy ? 0.6 : 1,
  transition: 'all 0.15s',
  minWidth: 90,
});

export default function FiltersConfig({
  specsRecords,
  specsTable,
  optionsRecords,
  optionFiltersTable,
  optionFiltersRecords,
  onBack,
}: FiltersConfigProps): JSX.Element {
  const [updating, setUpdating] = useState<string | null>(null);

  const toggleFilterable = async (record: AirtableRecord) => {
    const current = Boolean(record.getCellValue(FIELDS.spec.filterable));
    setUpdating(record.id);
    try {
      await specsTable.updateRecordAsync(record, { [FIELDS.spec.filterable]: !current });
    } finally {
      setUpdating(null);
    }
  };

  // Групи опцій = унікальні префікси назв до ":" (напр. "Колір сидіння: Чорний" → "Колір сидіння").
  const optionGroups = useMemo(() => {
    const set = new Set<string>();
    (optionsRecords || []).forEach((o) => {
      const name = String(o.getCellValue(FIELDS.option.name) || '');
      if (name.includes(':')) set.add(name.split(':')[0].trim());
    });
    return [...set].sort();
  }, [optionsRecords]);

  // groupName → рядок конфігурації (наявність рядка = група увімкнена як фільтр).
  const configByGroup = useMemo(() => {
    const map = new Map<string, AirtableRecord>();
    (optionFiltersRecords || []).forEach((r) => {
      const n = String(r.getCellValue(FIELDS.optionFilter.name) || '').trim();
      if (n) map.set(n, r);
    });
    return map;
  }, [optionFiltersRecords]);

  const toggleGroupEnabled = async (group: string, configRow?: AirtableRecord) => {
    if (!optionFiltersTable) return;
    setUpdating(`opt:${group}`);
    try {
      if (configRow) await optionFiltersTable.deleteRecordAsync(configRow);
      else await optionFiltersTable.createRecordAsync({ [FIELDS.optionFilter.name]: group });
    } finally {
      setUpdating(null);
    }
  };

  // Категорії зберігаються як текст через кому (поле типу Single line text).
  const parseCats = (row?: AirtableRecord) =>
    (row ? row.getCellValueAsString(FIELDS.optionFilter.categories) : '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const toggleCategory = async (configRow: AirtableRecord, catName: string) => {
    if (!optionFiltersTable) return;
    const current = parseCats(configRow);
    const next = current.includes(catName) ? current.filter((n) => n !== catName) : [...current, catName];
    await optionFiltersTable.updateRecordAsync(configRow, {
      [FIELDS.optionFilter.categories]: next.join(', '),
    });
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" marginBottom={4} style={{ gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: UI.primary,
            fontSize: 14,
            padding: '4px 0',
          }}
        >
          ← Назад
        </button>
        <Text size="xlarge" fontWeight="strong" textColor={UI.text}>
          Фільтри каталогу
        </Text>
      </Box>

      <Card marginBottom={3} padding={3}>
        <Text size="small" textColor={UI.textMuted}>
          Увімкніть «Фільтрується» для характеристик, які мають відображатись у фільтрі каталогу на сайті. Зміни набудуть чинності після оновлення кешу (до 1 години).
        </Text>
      </Card>

      <Section title="Характеристики">
        {specsRecords.length === 0 && (
          <Text textColor={UI.textMuted} size="small">Немає характеристик.</Text>
        )}
        {specsRecords.map((record) => {
          const name = String(record.getCellValue(FIELDS.spec.name) || '');
          const isFilterable = Boolean(record.getCellValue(FIELDS.spec.filterable));
          const isUpdating = updating === record.id;

          return (
            <Box
              key={record.id}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              paddingY={2}
              style={{ borderBottom: `1px solid ${UI.border}` }}
            >
              <Text textColor={UI.text} size="default">{name || '(без назви)'}</Text>
              <button
                disabled={isUpdating}
                onClick={() => toggleFilterable(record)}
                style={toggleBtnStyle(isFilterable, isUpdating)}
              >
                {isFilterable ? '✓ Фільтр' : 'Вимкнено'}
              </button>
            </Box>
          );
        })}
      </Section>

      <Box marginTop={4}>
        <Section title="Опції (кольори)">
          {!optionFiltersTable && (
            <Text textColor={UI.dangerText} size="small">
              Таблиця «Фільтри Опцій» не знайдена. Створіть її з полями «Назва» (текст) та «Категорії» (Single line text). Доступні категорії: {CATALOG_ITEMS.join(', ')}.
            </Text>
          )}
          {optionFiltersTable && optionGroups.length === 0 && (
            <Text textColor={UI.textMuted} size="small">Немає груп опцій (назви опцій мають формат «Група: Колір»).</Text>
          )}
          {optionFiltersTable && optionGroups.map((group) => {
            const configRow = configByGroup.get(group);
            const enabled = !!configRow;
            const isUpdating = updating === `opt:${group}`;
            const activeCats = parseCats(configRow);

            return (
              <Box
                key={group}
                paddingY={2}
                style={{ borderBottom: `1px solid ${UI.border}` }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Text textColor={UI.text} size="default">{group}</Text>
                  <button
                    disabled={isUpdating}
                    onClick={() => toggleGroupEnabled(group, configRow)}
                    style={toggleBtnStyle(enabled, isUpdating)}
                  >
                    {enabled ? '✓ Фільтр' : 'Вимкнено'}
                  </button>
                </Box>

                {enabled && configRow && (
                  <Box display="flex" flexWrap="wrap" marginTop={2} style={{ gap: 6 }}>
                    <Text size="small" textColor={UI.textMuted} marginRight={1}>Категорії:</Text>
                    {CATALOG_ITEMS.map((cat) => {
                      const on = activeCats.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(configRow, cat)}
                          style={{
                            cursor: 'pointer',
                            padding: '2px 10px',
                            borderRadius: 999,
                            border: `1px solid ${on ? UI.primary : UI.border}`,
                            fontSize: 12,
                            fontWeight: 600,
                            background: on ? UI.primary : '#FFFFFF',
                            color: on ? '#FFFFFF' : UI.textMuted,
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                    {activeCats.length === 0 && (
                      <Text size="small" textColor={UI.textMuted}>(усі категорії)</Text>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Section>
      </Box>
    </Box>
  );
}
