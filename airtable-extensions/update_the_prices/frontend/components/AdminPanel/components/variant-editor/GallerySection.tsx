import React, { useState } from 'react';
import { Box, Button, Text } from '@airtable/blocks/ui';
import { Record, Table } from '@airtable/blocks/models';
import { mediaApi } from '../../services/mediaApi';
import { FIELDS, UI } from '../../constants';
import { Section } from '../ui';

interface GallerySectionProps {
  variantId: string;
  variantsTable: Table | null;
  activeVariant: Record | undefined;
}

export function GallerySection({ variantId, variantsTable, activeVariant }: GallerySectionProps): JSX.Element {
  const [isUploading, setIsUploading] = useState(false);
  const galleryUrls = activeVariant?.getCellValueAsString(FIELDS.variant.photos)?.split('\n').filter(Boolean) || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      await mediaApi.uploadImages(files, variantId);
      alert('Фотографії успішно завантажено!');
    } catch (error) {
      console.error(error);
      alert('Не вдалося завантажити картинки.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (url: string) => {
    if (!window.confirm('Видалити це фото з Cloudflare R2?')) return;
    try {
      await mediaApi.deleteImage(url, variantId);
      alert('Фото видалено!');
    } catch (error) {
      console.error(error);
      alert('Не вдалося видалити фото.');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!variantsTable) return;
    const urls = [...galleryUrls];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === urls.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [urls[index], urls[targetIndex]] = [urls[targetIndex], urls[index]];

    await variantsTable.updateRecordAsync(variantId, { [FIELDS.variant.photos]: urls.join('\n') });
  };

  return (
    <Section title="Галерея варіації (Cloudflare R2)">
      <Box marginBottom={3} display="flex" flexDirection="column" style={{ gap: 8 }}>
        {galleryUrls.map((url, idx, arr) => (
          <Box
            key={idx}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            padding={2}
            style={{ background: UI.rowBg, border: `1px solid ${UI.border}`, borderRadius: 8 }}
          >
            <Box flex="1" overflow="hidden" marginRight={3}>
              <a href={url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', color: UI.primary }}>{url}</a>
            </Box>
            <Box display="flex" alignItems="center" flexShrink={0} style={{ gap: 4 }}>
              <Button size="small" icon="chevronUp" onClick={() => handleMove(idx, 'up')} disabled={idx === 0} />
              <Button size="small" icon="chevronDown" onClick={() => handleMove(idx, 'down')} disabled={idx === arr.length - 1} />
              <Button size="small" icon="trash" variant="danger" onClick={() => handleDelete(url)} />
            </Box>
          </Box>
        ))}
        {galleryUrls.length === 0 && <Text textColor="light">Фотографій ще немає</Text>}
      </Box>

      <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={isUploading} style={{ display: 'block' }} />
      {isUploading && <Text textColor="light" marginTop={2}>Завантаження картинок в Cloudflare R2… ⏳</Text>}
    </Section>
  );
}
