import { API_BASE_URL as NEXT_API_BASE_URL } from '../constants';

export const mediaApi = {
  
  uploadVideo: async (file: File, productId: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', productId);

    const response = await fetch(`${NEXT_API_BASE_URL}/api/products/media/videos`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Помилка завантаження відео');
    }

    return data.url; 
  },

  deleteVideo: async (url: string, productId: string): Promise<void> => {
    const response = await fetch(`${NEXT_API_BASE_URL}/api/products/media/videos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, productId }),
    });

    if (!response.ok) {
      throw new Error('Помилка видалення відео');
    }
  },

  uploadImages: async (files: FileList, variantId: string) => {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('file', file));
    formData.append('variationId', variantId);

    const res = await fetch(`${NEXT_API_BASE_URL}/api/products/media/images`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    return data.addedUrls; 
  },

  deleteImage: async (url: string, variantId: string): Promise<void> => {
    const response = await fetch(`${NEXT_API_BASE_URL}/api/products/media/images`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, variantId }),
    });

    if (!response.ok) {
      throw new Error('Помилка видалення фото');
    }
  }
};