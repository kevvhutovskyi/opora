import React from 'react';
import { Box, Text, Switch } from '@airtable/blocks/ui';
import { Record } from '@airtable/blocks/models';
import { FIELDS, UI } from '../../constants';
import { Badge } from '../ui';

interface RequestRowProps {
  request: Record;
  productNameById: Map<string, string>;
  onToggleWarmed: (recordId: string, currentValue: boolean) => void;
}

export function RequestRow({ request, productNameById, onToggleWarmed }: RequestRowProps): JSX.Element {
  const isWarmed = Boolean(request.getCellValue(FIELDS.request.warmed));
  // «Замовлення» лінкує на «Товари», чиє первинне поле порожнє → резолвимо id у «Модель».
  const linkedOrder = ((request.getCellValue(FIELDS.request.order) as Array<{ id: string }> | null) || [])
    .map((l) => productNameById.get(l.id) || 'Без назви')
    .join(', ');

  const delivery = request.getCellValueAsString(FIELDS.request.delivery);
  const deliveryCity = request.getCellValueAsString(FIELDS.request.deliveryCity);
  const deliveryWarehouse = request.getCellValueAsString(FIELDS.request.deliveryWarehouse);
  const deliveryText = [delivery, deliveryCity, deliveryWarehouse].filter(Boolean).join(', ');

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      padding={3}
      style={{
        background: isWarmed ? UI.successBg : UI.rowBg,
        border: `1px solid ${isWarmed ? '#BFE3CC' : UI.border}`,
        borderRadius: 10,
      }}
    >
      <Box display="flex" flexDirection="column" style={{ gap: 4 }}>
        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
          <Text fontWeight="bold">#{request.getCellValueAsString(FIELDS.request.number)}</Text>
          <Text>{request.getCellValueAsString(FIELDS.request.name) || 'Без імені'}</Text>
          {isWarmed && <Badge tone="success">Прогрітий</Badge>}
        </Box>
        <Text size="small" textColor="light">
          📞 {request.getCellValueAsString(FIELDS.request.phone) || '—'}
        </Text>
        {linkedOrder && <Text size="small" textColor="blue">🛒 Замовлення: {linkedOrder}</Text>}
        {deliveryText && <Text size="small" textColor="light">🚚 {deliveryText}</Text>}
      </Box>

      <Box padding={2} style={{ background: UI.cardBg, borderRadius: 8 }}>
        <Switch value={isWarmed} onChange={() => onToggleWarmed(request.id, isWarmed)} label="Прогрет" />
      </Box>
    </Box>
  );
}
