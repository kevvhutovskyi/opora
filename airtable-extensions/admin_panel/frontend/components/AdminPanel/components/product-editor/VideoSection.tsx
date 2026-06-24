import React, { useState } from 'react';
import { Box, Button, Text } from '@airtable/blocks/ui';
import { Record } from '@airtable/blocks/models';
import { mediaApi } from '../../services/mediaApi';
import { FIELDS, UI } from '../../constants';
import { Section } from '../ui';

interface VideoSectionProps {
  productId: string;
  productRecord: Record | null;
}

export function VideoSection({ productId, productRecord }: VideoSectionProps): JSX.Element {
  const [isUploading, setIsUploading] = useState(false);
  const videoUrls = productRecord?.getCellValueAsString(FIELDS.product.assemblyVideo)?.split('\n').filter(Boolean) || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await mediaApi.uploadVideo(file, productId);
      alert('Відео успішно завантажено!');
    } catch (err) {
      console.error('Upload Error:', err);
      alert(err instanceof Error ? err.message : 'Помилка завантаження');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (url: string) => {
    if (!window.confirm('Видалити це відео з Cloudflare R2?')) return;
    try {
      await mediaApi.deleteVideo(url, productId);
      alert('Відео видалено!');
    } catch (error) {
      console.error('Delete Video Error:', error);
      alert('Не вдалося видалити відео.');
    }
  };

  return (
    <Section title="Відео збірки (R2)">
      {videoUrls.map((url, idx) => (
        <Box
          key={idx}
          padding={2}
          marginBottom={2}
          style={{ background: UI.rowBg, border: `1px solid ${UI.border}`, borderRadius: 8 }}
        >
          <video
            src={url}
            controls
            style={{ width: '100%', maxHeight: 320, borderRadius: 6, background: '#000', display: 'block' }}
          />
          <Box display="flex" alignItems="center" justifyContent="space-between" marginTop={2}>
            <a href={url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', color: UI.primary }}>{url}</a>
            <Button size="small" icon="trash" variant="danger" onClick={() => handleDelete(url)} style={{ flexShrink: 0, marginLeft: 12 }} />
          </Box>
        </Box>
      ))}
      {videoUrls.length === 0 && (
        <input type="file" accept="video/*" onChange={handleUpload} disabled={isUploading} />
      )}
      {isUploading && <Text textColor="light">Завантаження… ⏳</Text>}
    </Section>
  );
}
