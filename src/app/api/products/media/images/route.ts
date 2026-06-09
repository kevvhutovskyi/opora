import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { tableVariants, FIELDS } from "@/lib/airtable";
import r2Client from "@/lib/r2/r2.client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const images = formData.getAll('file') as File[];
    const variationId = formData.get('variationId') as string;

    if (!images.length || !variationId) {
      return NextResponse.json({ error: 'No files or variationId' }, { status: 400 });
    }

    // 1. Завантажуємо всі картинки в R2 ПАРАЛЕЛЬНО
    const uploadPromises = images.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      // Зберігаємо безпосередньо в папку images/ всередині R2
      const fileKey = `images/${uniqueFilename}`;

      await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: file.type,
      }));

      // Повертаємо готовий публічний URL з вашим доменом
      return `${process.env.R2_PUBLIC_DOMAIN}/${fileKey}`;
    });

    const newImageUrls = await Promise.all(uploadPromises);

    // 2. Оновлюємо Airtable
    const record = await tableVariants.find(variationId);
    const existingUrlsString = (record.get(FIELDS.variant.photos) as string) || '';

    // Split existing string into an array, combine with new urls, filter empties, and join
    const combinedUrls = [...existingUrlsString.split('\n'), ...newImageUrls]
      .map(url => url.trim())
      .filter(url => url.length > 0)
      .join('\n');

    await tableVariants.update(variationId, {
      [FIELDS.variant.photos]: combinedUrls
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
    const { url, variantId } = body as { url: string, variantId: string };

    if (!url || !variantId) {
      return NextResponse.json({ error: 'Відсутні обов\'язкові параметри (url, variantId)' }, { status: 400 });
    }

    // 1. Витягуємо Key разом з папкою (наприклад: "images/123456-image.jpg")
    const urlObj = new URL(url);
    const fileKey = urlObj.pathname.substring(1); 

    // 2. Видаляємо файл з Cloudflare R2
    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    }));

    // 3. Оновлюємо Airtable (видаляємо лінк із текстового поля)
    const record = await tableVariants.find(variantId);
    const existingUrls = (record.get(FIELDS.variant.photos) as string) || '';
    
    const updatedUrls = existingUrls
      .split('\n')
      .filter(existingUrl => existingUrl.trim() !== url.trim())
      .join('\n');

    await tableVariants.update(variantId, {
      [FIELDS.variant.photos]: updatedUrls
    });

    return NextResponse.json({ success: true, message: 'Файл успішно видалено' }, { status: 200 });

  } catch (error) {
    console.error('Delete File Error:', error);
    return NextResponse.json({ error: 'Помилка видалення файлу' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}