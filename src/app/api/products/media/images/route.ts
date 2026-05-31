import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { tableVariants } from "@/lib/airtable";
import r2Client from "@/lib/r2/r2.client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const images = formData.getAll('file') as File[];
    const variationId = formData.get('variationId') as string;

    if (!images.length || !variationId) {
      return NextResponse.json({ error: 'No files or variationId' }, { status: 400 });
    }

    // 1. Завантажуємо всі картинки в R2 ПАРАЛЕЛЬНО для швидкості
    const uploadPromises = images.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Генеруємо унікальне ім'я, щоб файли не перезаписували один одного
      const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;

      await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: uniqueFilename,
        Body: buffer,
        ContentType: file.type,
      }));

      // Повертаємо готовий публічний URL
      return `https://${process.env.R2_PUBLIC_DOMAIN}/images/${uniqueFilename}`;
    });

    // Чекаємо, поки всі файли завантажаться
    const newImageUrls = await Promise.all(uploadPromises);

    // 2. Оновлюємо Airtable
    // Спочатку дістаємо поточну варіацію, щоб не затерти старі фото
    const record = await tableVariants.find(variationId);
    const existingUrls = (record.get('Фото (URLs)') as string) || '';

    // Збираємо все в один масив, відфільтровуємо порожні рядки і склеюємо через \n
    const combinedUrls = [existingUrls, ...newImageUrls]
      .filter(url => url.trim() !== '') 
      .join('\n');

    // Оновлюємо запис в Airtable
    await tableVariants.update(variationId, {
      'Фото (URLs)': combinedUrls
    });

    return NextResponse.json({ 
      success: true, 
      addedUrls: newImageUrls 
    }, { status: 200 });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Upload Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, recordId } = body as { url: string, recordId: string };

    // type може бути 'variant' (для картинок) або 'product' (для відео)
    if (!url || !recordId) {
      return NextResponse.json({ error: 'Відсутні обов\'язкові параметри (url, recordId)' }, { status: 400 });
    }

    // 1. Витягуємо Key (ім'я файлу) з URL для Cloudflare R2
    // Наприклад: https://твій-домен.com/123456-image.jpg -> 123456-image.jpg
    const urlObj = new URL(url);
    const fileKey = urlObj.pathname.substring(1); // Видаляємо перший слеш '/'

    // 2. Видаляємо файл з Cloudflare R2
    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    }));

    // 3. Оновлюємо Airtable (видаляємо лінк із текстового поля)
    const record = await tableVariants.find(recordId);
    const existingUrls = (record.get('Фото (URLs)') as string) || '';
    
    // Розбиваємо рядок на масив, фільтруємо видалений URL і склеюємо назад
    const updatedUrls = existingUrls
      .split('\n')
      .filter(existingUrl => existingUrl.trim() !== url.trim())
      .join('\n');

    await tableVariants.update(recordId, {
      'Фото (URLs)': updatedUrls
    });

    return NextResponse.json({ success: true, message: 'Файл успішно видалено' }, { status: 200 });

  } catch (error) {
    console.error('Delete File Error:', error);
    return NextResponse.json({ error: 'Помилка видалення файлу' }, { status: 500 });
  }
}


export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}