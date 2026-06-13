import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import r2Client from "@/lib/r2/r2.client";

// Завантаження зображень банерів (Hero Slider / Catalog Hero) у папку banners/ в R2.
// Записи в Airtable створює/оновлює сам блок адмін-панелі — тут лише робота з файлами.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files' }, { status: 400 });
    }

    const uploadPromises = files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      // Окрема папка banners/ — не images/ і не videos/
      const fileKey = `banners/${uniqueFilename}`;

      await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: file.type,
      }));

      return `${process.env.R2_PUBLIC_DOMAIN}/${fileKey}`;
    });

    const urls = await Promise.all(uploadPromises);

    return NextResponse.json({
      success: true,
      url: urls[0],
      urls,
    }, { status: 200 });

  } catch (error) {
    console.error('Banner Upload Error:', error);
    return NextResponse.json({ error: 'Помилка завантаження зображення' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url: string };

    if (!url) {
      return NextResponse.json({ error: 'Відсутній обов\'язковий параметр (url)' }, { status: 400 });
    }

    // Повний ключ разом з папкою, напр. "banners/123456-image.jpg"
    const urlObj = new URL(url);
    const fileKey = urlObj.pathname.substring(1);

    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    }));

    return NextResponse.json({ success: true, message: 'Файл успішно видалено' }, { status: 200 });

  } catch (error) {
    console.error('Banner Delete Error:', error);
    return NextResponse.json({ error: 'Помилка видалення файлу' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
