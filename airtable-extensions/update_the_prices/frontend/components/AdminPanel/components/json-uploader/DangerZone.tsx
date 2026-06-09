import React from 'react';
import { Box, Button, Text } from '@airtable/blocks/ui';
import { UI } from '../../constants';

interface DangerZoneProps {
  totalDbRecords: number;
  disabled: boolean;
  onClearDb: () => void;
}

export function DangerZone({ totalDbRecords, disabled, onClearDb }: DangerZoneProps): JSX.Element {
  return (
    <Box style={{ borderTop: `1px solid ${UI.dangerBg}`, paddingTop: 24, marginTop: 24 }}>
      <Text fontWeight="bold" marginBottom={2}>Небезпечна зона</Text>
      <Text textColor="light" size="small" marginBottom={3}>
        Видаляє ВСІ записи з таблиць: Товари, Варіації, Опції, Характеристики ({totalDbRecords} записів).
      </Text>
      <Button variant="danger" icon="trash" onClick={onClearDb} disabled={disabled}>
        Очистити базу повністю
      </Button>
    </Box>
  );
}
