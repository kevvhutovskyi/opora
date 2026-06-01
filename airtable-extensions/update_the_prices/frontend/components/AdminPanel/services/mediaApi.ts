// Ideally, this should come from an environment variable in a real app
// e.g., process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const NEXT_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const mediaApi = {
  
  uploadVideo: async (file: File, productId: string): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', productId);

    const response = await fetch(`${NEXT_API_BASE_URL}/api/products/media/videos`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Помилка завантаження відео');
    }
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

  uploadImages: async (files: FileList | File[], variantId: string): Promise<void> => {
    const formData = new FormData();
    
    Array.from(files).forEach((file) => {
      formData.append('file', file);
    });
    formData.append('variationId', variantId);

    const response = await fetch(`${NEXT_API_BASE_URL}/api/products/media/images`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Помилка завантаження картинок');
    }
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