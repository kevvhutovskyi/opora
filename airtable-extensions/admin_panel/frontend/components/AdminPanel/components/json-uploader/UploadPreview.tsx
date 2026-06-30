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
          Готово до завантаження — {data.length} товар(ів):
        </Text>
        {data.map((p, idx) => (
          <Text key={`${p.name}-${idx}`} size="small">
            • {p.name} — {p.variants?.length || 0} варіацій, {(p.characteristics || []).length} характеристик
          </Text>
        ))}
      </Box>
      <Button variant="primary" icon="upload" onClick={onUpload}>Завантажити в Airtable</Button>
    </Box>
  );
}
