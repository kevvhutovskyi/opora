import React, { useState } from 'react';
import { Box, Button, Heading, Text } from '@airtable/blocks/ui';
import { Record, Table } from '@airtable/blocks/models';
import { FIELDS, UI } from '../constants';
import { Card, Badge } from './ui';
import { RequestRow } from './requests/RequestRow';

interface RequestsCRMProps {
  requestsTable: Table | null;
  requestsRecords: Record[] | null;
  onGoBack: () => void;
}

const ITEMS_PER_PAGE = 10;

export default function RequestsCRM({
  requestsTable,
  requestsRecords,
  onGoBack,
}: RequestsCRMProps): JSX.Element {
  const [currentPage, setCurrentPage] = useState(1);

  const totalRecords = requestsRecords?.length || 0;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
  const indexOfLast = currentPage * ITEMS_PER_PAGE;
  const currentRequests = requestsRecords?.slice(indexOfLast - ITEMS_PER_PAGE, indexOfLast) || [];

  const warmedCount = (requestsRecords || []).filter((r) => Boolean(r.getCellValue(FIELDS.request.warmed))).length;

  const handleToggleWarmed = async (recordId: string, currentValue: boolean) => {
    if (!requestsTable) return;
    try {
      await requestsTable.updateRecordAsync(recordId, { [FIELDS.request.warmed]: !currentValue });
    } catch (error) {
      console.error(error);
      alert('Помилка при оновленні статусу заявки');
    }
  };

  return (
    <Card style={{ minHeight: 500, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={4}>
        <Box display="flex" alignItems="center" style={{ gap: 12 }}>
          <Button onClick={onGoBack} icon="chevronLeft" aria-label="Назад" />
          <Heading margin={0}>Заявки клієнтів</Heading>
        </Box>
        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
          <Badge tone="success">Прогріто: {warmedCount}</Badge>
          <Badge tone="neutral">Всього: {totalRecords}</Badge>
        </Box>
      </Box>

      {/* List */}
      <Box flex="1" display="flex" flexDirection="column" style={{ gap: 8 }}>
        {currentRequests.length === 0 ? (
          <Text textColor="light" textAlign="center" marginTop={4}>Заявок поки немає.</Text>
        ) : (
          currentRequests.map((request) => (
            <RequestRow key={request.id} request={request} onToggleWarmed={handleToggleWarmed} />
          ))
        )}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" alignItems="center" marginTop={4} paddingTop={3} style={{ borderTop: `1px solid ${UI.border}`, gap: 8 }}>
          <Button onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1} icon="chevronLeft" aria-label="Попередня" />
          <Text textColor="light">Сторінка {currentPage} з {totalPages}</Text>
          <Button onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages} icon="chevronRight" aria-label="Наступна" />
        </Box>
      )}
    </Card>
  );
}
