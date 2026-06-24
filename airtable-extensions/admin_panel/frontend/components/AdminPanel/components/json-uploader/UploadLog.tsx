import React from 'react';
import { Box, Text } from '@airtable/blocks/ui';
import { UI } from '../../constants';

interface UploadLogProps {
  log: string[];
  isUploading: boolean;
  isUndoing: boolean;
}

export function UploadLog({ log, isUploading, isUndoing }: UploadLogProps): JSX.Element {
  return (
    <Box marginTop={3} padding={3} overflowY="auto" maxHeight="320px" style={{ background: UI.rowBg, border: `1px solid ${UI.border}`, borderRadius: 8 }}>
      {log.map((msg, i) => (
        <Text key={i} size="small">{msg}</Text>
      ))}
      {isUploading && <Text size="small" textColor="light">⏳ Завантаження...</Text>}
      {isUndoing && <Text size="small" textColor="light">⏳ Скасування...</Text>}
    </Box>
  );
}
