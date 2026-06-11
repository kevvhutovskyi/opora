import React, { useState } from 'react';
import { Box, Text } from '@airtable/blocks/ui';
import { Record as AirtableRecord, Table } from '@airtable/blocks/models';
import { FIELDS, UI } from '../constants';
import { Card, Section } from './ui';

interface FiltersConfigProps {
  specsRecords: AirtableRecord[];
  specsTable: Table;
  onBack: () => void;
}

export default function FiltersConfig({ specsRecords, specsTable, onBack }: FiltersConfigProps): JSX.Element {
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
                style={{
                  cursor: isUpdating ? 'wait' : 'pointer',
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  background: isFilterable ? UI.successBg : '#EEF1F4',
                  color: isFilterable ? UI.successText : UI.textMuted,
                  opacity: isUpdating ? 0.6 : 1,
                  transition: 'all 0.15s',
                  minWidth: 90,
                }}
              >
                {isFilterable ? '✓ Фільтр' : 'Вимкнено'}
              </button>
            </Box>
          );
        })}
      </Section>
    </Box>
  );
}
