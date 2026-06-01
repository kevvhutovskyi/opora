import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Switch,
  colors,
} from '@airtable/blocks/ui';
import { Record, Table } from '@airtable/blocks/models';

interface RequestsCRMProps {
  requestsTable: Table | null;
  requestsRecords: Record[] | null;
  onGoBack: () => void;
}

export default function RequestsCRM({
  requestsTable,
  requestsRecords,
  onGoBack,
}: RequestsCRMProps): JSX.Element {
  
  // 1. Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // 2. Derived Pagination Data
  const totalRecords = requestsRecords?.length || 0;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
  const indexOfLastRequest = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstRequest = indexOfLastRequest - ITEMS_PER_PAGE;
  
  const currentRequests = requestsRecords?.slice(indexOfFirstRequest, indexOfLastRequest) || [];

  // 3. Handlers
  const handleToggleProhret = async (recordId: string, currentValue: boolean) => {
    if (!requestsTable) return;
    try {
      await requestsTable.updateRecordAsync(recordId, {
        'Прогрет': !currentValue,
      });
    } catch (error) {
      console.error(error);
      alert('Помилка при оновленні статусу заявки');
    }
  };

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <Box backgroundColor="white" padding={4} borderRadius="large" minHeight="500px" display="flex" flexDirection="column">
      
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={4}>
        <Box display="flex" alignItems="center">
          <Button onClick={onGoBack} marginRight={3} icon="chevronLeft" aria-label="Назад" />
          <Heading>Заявки клієнтів (CRM)</Heading>
        </Box>
        <Text textColor="light">Всього: {totalRecords}</Text>
      </Box>

      {/* List Container */}
      <Box flex="1">
        {currentRequests.length === 0 ? (
          <Text textColor="light" textAlign="center" marginTop={4}>
            Заявок поки немає.
          </Text>
        ) : (
          currentRequests.map((request) => {
            const isProhret = Boolean(request.getCellValue('Прогрет'));
            const linkedOrder = request.getCellValueAsString('Замовлення');
            
            return (
              <Box 
                key={request.id} 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center" 
                padding={3} 
                marginBottom={2}
                backgroundColor={isProhret ? colors.GREEN_LIGHT_2 : colors.GRAY_LIGHT_1} 
                borderRadius="medium"
                border="thick"
                borderColor={isProhret ? colors.GREEN_LIGHT_1 : 'transparent'}
              >
                <Box display="flex" flexDirection="column">
                  <Box display="flex" alignItems="center">
                    <Text marginRight={2} fontWeight="bold">
                      #{request.getCellValueAsString('Номер')}
                    </Text>
                    <Text>
                      {request.getCellValueAsString('Ім\'я') || 'Без імені'}
                    </Text>
                  </Box>
                  <Text size="small" textColor="light" marginTop={1}>
                    📞 {request.getCellValueAsString('Номер телефону') || '—'}
                  </Text>
                  {linkedOrder && (
                    <Text size="small" textColor="blue" marginTop={1}>
                      🛒 Замовлення: {linkedOrder}
                    </Text>
                  )}
                </Box>
                
                <Box padding={2} backgroundColor="white" borderRadius="large">
                  <Switch 
                    value={isProhret} 
                    onChange={() => handleToggleProhret(request.id, isProhret)} 
                    label="Прогрет" 
                  />
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" alignItems="center" marginTop={4} paddingTop={3} borderTop="thick" borderColor={colors.GRAY_LIGHT_2}>
          <Button 
            onClick={() => paginate(currentPage - 1)} 
            disabled={currentPage === 1}
            icon="chevronLeft"
            marginRight={2}
            aria-label="Попередня"
          />
          <Text marginRight={2} textColor="light">
            Сторінка {currentPage} з {totalPages}
          </Text>
          <Button 
            onClick={() => paginate(currentPage + 1)} 
            disabled={currentPage === totalPages}
            icon="chevronRight"
            aria-label="Наступна"
          />
        </Box>
      )}
      
    </Box>
  );
}