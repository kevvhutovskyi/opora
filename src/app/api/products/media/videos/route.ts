import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import r2Client from "@/lib/r2/r2.client";
import { tableProducts, tableVariants } from "@/lib";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const video = formData.get('file') as File;
    const productId = formData.get('productId') as string;

    if (!video || !productId) {
      return NextResponse.json({ error: 'No file or productId' }, { status: 400 });
    }

    const bytes = await video.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uniqueFilename = `${Date.now()}-${video.name.replace(/\s+/g, '-')}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFilename,
      Body: buffer,
      ContentType: video.type,
    }));

    const newVideoUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/videos/${uniqueFilename}`;

    await tableProducts.update(productId, {
      'Відео Збірки': newVideoUrl
    });

    return NextResponse.json({ 
      success: true, 
      url: newVideoUrl,
    }, { status: 200 });

  } catch (error) {
    console.error('Video Upload Error:', error);
    return NextResponse.json({ error: 'Помилка завантаження відео' }, { status: 500 });
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
    await tableVariants.update(recordId, {
      'Фото (URLs)': '',
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