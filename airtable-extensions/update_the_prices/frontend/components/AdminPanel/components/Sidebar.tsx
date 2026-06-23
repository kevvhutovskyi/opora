import React from 'react';
import { Box, Icon, Text } from '@airtable/blocks/ui';
import { UI } from '../constants';

// key збігається зі значеннями типу View у AdminPanel — навігація = setView(key).
export const NAV_ITEMS = [
  { key: 'list', icon: 'cube', label: 'Каталог' },
  { key: 'requests', icon: 'aiAssistant', label: 'Заявки' },
  { key: 'json_upload', icon: 'upload', label: 'JSON' },
  { key: 'bulk_images', icon: 'attachment', label: 'Фото' },
  { key: 'filters_config', icon: 'filter', label: 'Фільтри' },
  { key: 'banners', icon: 'gallery', label: 'Банери' },
  { key: 'comments', icon: 'chat', label: 'Відгуки' },
] as const;

interface SidebarProps {
  active: string;
  onNavigate: (key: string) => void;
}

/** Статичний лівий навбар розділів CMS. */
export function Sidebar({ active, onNavigate }: SidebarProps): JSX.Element {
  return (
    <Box
      backgroundColor={UI.cardBg}
      padding={2}
      display="flex"
      flexDirection="column"
      style={{
        width: 220,
        flexShrink: 0,
        height: '100vh',
        borderRight: `1px solid ${UI.border}`,
        gap: 4,
        position: 'sticky',
        top: 0,
      }}
    >
      {NAV_ITEMS.map(({ key, icon, label }) => {
        const isActive = key === active;
        return (
          <Box
            key={key}
            display="flex"
            alignItems="center"
            onClick={() => onNavigate(key)}
            backgroundColor={isActive ? '#E8F0FE' : undefined}
            style={{
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <Icon name={icon} size={16} fillColor={isActive ? UI.primary : UI.textMuted} />
            <Text size="default" style={{ color: isActive ? UI.primary : UI.text, fontWeight: isActive ? 600 : 400 }}>
              {label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
