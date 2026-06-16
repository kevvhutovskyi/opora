import React, { useEffect, useRef } from 'react';
import { Box, Button, Heading, Text, Select } from '@airtable/blocks/ui';
import { Record } from '@airtable/blocks/models';
import { UI } from '../constants';
import { useBulkImageUpload } from '../hooks/useBulkImageUpload';
import { Card, Badge } from './ui';
import { UploadLog } from './json-uploader/UploadLog';

interface BulkImageUploaderProps {
  productsRecords: Record[] | null;
  variantsRecords: Record[] | null;
  optionsRecords: Record[] | null;
  onGoBack: () => void;
}

const UNASSIGNED = '';

export default function BulkImageUploader({
  productsRecords,
  variantsRecords,
  optionsRecords,
  onGoBack,
}: BulkImageUploaderProps): JSX.Element {
  const {
    rows,
    stats,
    optionsForRow,
    isUploading,
    isDone,
    log,
    handleFiles,
    setVariantForRow,
    handleUpload,
    handleReset,
  } = useBulkImageUpload({ productsRecords, variantsRecords, optionsRecords });

  // webkitdirectory немає в типах React — вмикаємо вибір цілої теки через ref.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute('webkitdirectory', '');
      inputRef.current.setAttribute('directory', '');
    }
  }, []);

  const hasRows = rows.length > 0;

  return (
    <Card>
      <Box display="flex" alignItems="center" marginBottom={4} style={{ gap: 12 }}>
        <Button icon="chevronLeft" onClick={onGoBack} aria-label="Назад" />
        <Heading margin={0}>Масове завантаження фото</Heading>
      </Box>

      <Box marginBottom={3}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
          style={{ display: 'block', marginBottom: '8px' }}
        />
        <Text textColor="light" size="small">
          Оберіть кореневу теку. Очікувана структура: &lt;Товар&gt;/output/&lt;колір&gt;/файли
          (напр. Марсель/output/beige-black/...). Зіставлення — за назвою варіації «Назва».
        </Text>
      </Box>

      {hasRows && !isUploading && !isDone && (
        <>
          <Box
            display="flex"
            marginBottom={3}
            style={{ gap: 8, flexWrap: 'wrap' }}
          >
            <Badge tone="info">Тек: {stats.folders}</Badge>
            <Badge tone="info">Фото: {stats.files}</Badge>
            <Badge tone="success">Зіставлено: {stats.matched}</Badge>
            {stats.unmatched > 0 && <Badge tone="warn">Не зіставлено: {stats.unmatched}</Badge>}
          </Box>

          <Box
            style={{ border: `1px solid ${UI.border}`, borderRadius: 8, overflow: 'hidden' }}
            marginBottom={3}
          >
            {rows.map((row, i) => (
              <Box
                key={row.key}
                display="flex"
                alignItems="center"
                padding={2}
                style={{
                  gap: 12,
                  background: i % 2 ? UI.rowBg : UI.cardBg,
                  borderTop: i ? `1px solid ${UI.border}` : 'none',
                }}
              >
                <Box flex="1" style={{ minWidth: 0 }}>
                  <Text size="small" style={{ fontWeight: 600 }}>
                    {row.product} / {row.combo}
                  </Text>
                  <Text size="small" textColor="light">{row.files.length} фото</Text>
                </Box>
                <Box style={{ flexShrink: 0 }}>
                  {row.matchedAuto ? (
                    <Badge tone="success">авто</Badge>
                  ) : row.variantId ? (
                    <Badge tone="info">вручну</Badge>
                  ) : (
                    <Badge tone="warn">не знайдено</Badge>
                  )}
                </Box>
                <Box style={{ width: 280, flexShrink: 0 }}>
                  <Select
                    options={[{ value: UNASSIGNED, label: '— не вибрано —' }, ...optionsForRow(row)]}
                    value={row.variantId || UNASSIGNED}
                    onChange={(value) =>
                      setVariantForRow(row.key, value ? String(value) : null)
                    }
                    size="small"
                  />
                </Box>
              </Box>
            ))}
          </Box>

          <Button
            variant="primary"
            icon="upload"
            onClick={handleUpload}
            disabled={stats.matched === 0}
          >
            Завантажити {stats.matched} варіацій ({stats.files} фото)
          </Button>
        </>
      )}

      {(isUploading || log.length > 0) && (
        <UploadLog log={log} isUploading={isUploading} isUndoing={false} />
      )}

      {isDone && (
        <Box marginTop={3} display="flex" alignItems="center" style={{ gap: 8 }}>
          <Button variant="primary" onClick={onGoBack}>До списку товарів</Button>
          <Button onClick={handleReset}>Завантажити ще</Button>
        </Box>
      )}
    </Card>
  );
}
