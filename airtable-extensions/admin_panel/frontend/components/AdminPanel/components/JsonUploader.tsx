import React from 'react';
import { Box, Button, Heading, Text } from '@airtable/blocks/ui';
import { UI } from '../constants';
import { useJsonUpload } from '../hooks/useJsonUpload';
import { Card } from './ui';
import { UploadPreview } from './json-uploader/UploadPreview';
import { UploadLog } from './json-uploader/UploadLog';
import { DangerZone } from './json-uploader/DangerZone';

const FORMAT_HINT =
  '{ "models": [{ "name", "price", "characteristics", "variants", "description_markdown" }], "colors": { "Чорний": "#000000" } }';

export default function JsonUploader({ onGoBack }: { onGoBack: () => void }): JSX.Element {
  const {
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
  } = useJsonUpload();

  return (
    <Card>
      <Box display="flex" alignItems="center" marginBottom={4} style={{ gap: 12 }}>
        <Button icon="chevronLeft" onClick={onGoBack} aria-label="Назад" />
        <Heading margin={0}>Завантаження товарів з JSON</Heading>
      </Box>

      <Box marginBottom={3}>
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          disabled={isUploading}
          style={{ display: 'block', marginBottom: '8px' }}
        />
        <Text textColor="light" size="small">Формат: {FORMAT_HINT}</Text>
      </Box>

      {parseError && (
        <Box padding={3} marginBottom={3} style={{ background: UI.dangerBg, borderRadius: 8 }}>
          <Text>Помилка парсингу: {parseError}</Text>
        </Box>
      )}

      {parsedData && !isUploading && !isDone && <UploadPreview data={parsedData} onUpload={handleUpload} />}

      {(isUploading || log.length > 0) && <UploadLog log={log} isUploading={isUploading} isUndoing={isUndoing} />}

      {isDone && (
        <Box marginTop={3} display="flex" alignItems="center" style={{ gap: 8 }}>
          <Button variant="primary" onClick={onGoBack}>До списку товарів</Button>
          <Button onClick={handleReset}>Завантажити ще</Button>
          <Button variant="danger" icon="undo" onClick={handleUndo} disabled={isUndoing}>Скасувати завантаження</Button>
        </Box>
      )}

      <DangerZone totalDbRecords={totalDbRecords} disabled={isUndoing || isUploading} onClearDb={handleClearDb} />
    </Card>
  );
}
