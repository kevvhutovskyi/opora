import React from 'react';
import { Box, Button, Text } from '@airtable/blocks/ui';
import { UI } from '../../constants';
import { JsonData } from '../../hooks/useJsonUpload';

interface UploadPreviewProps {
  data: JsonData;
  onUpload: () => void;
}

export function UploadPreview({ data, onUpload }: UploadPreviewProps): JSX.Element {
  return (
    <Box marginBottom={3}>
      <Box padding={3} marginBottom={3} style={{ background: UI.successBg, borderRadius: 8 }}>
        <Text fontWeight="bold" marginBottom={2}>
          Готово до завантаження — {data.models.length} товар(ів):
        </Text>
        {data.models.map((m) => (
          <Text key={m.name} size="small">
            • {m.name} — {m.variants?.length || 0} варіацій, {Object.keys(m.characteristics || {}).length} характеристик
          </Text>
        ))}
        <Text size="small" marginTop={2}>
          Палітра кольорів: {Object.keys(data.colors || {}).length} шт.
          {!data.colors && ' (відсутня — назви кольорів буде взято з HEX)'}
        </Text>
      </Box>
      <Button variant="primary" icon="upload" onClick={onUpload}>Завантажити в Airtable</Button>
    </Box>
  );
}
