import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { tableVariants, FIELDS } from "@/lib/airtable";
import r2Client from "@/lib/r2/r2.client";

// Об'єднує наявний (newline-розділений) рядок URL з новими, прибирає порожні.
function mergeUrls(existing: unknown, additions: string[]): string {
  return [...String(existing || '').split('\n'), ...additions]
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .join('\n');
}

// Розбиває newline/кома-розділений рядок URL на масив.
function splitUrls(existing: unknown): string[] {
  return String(existing || '')
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

// Витягує R2-ключ із публічного URL (наприклад: "images/123-photo.jpg").
function keyFromUrl(url: string): string | null {
  try {
    return new URL(url).pathname.substring(1) || null;
  } catch {
    return null;
  }
}

// Видаляє з R2 усі об'єкти, на які посилаються старі URL варіації (оригінали + стиснені).
// Для кожного оригіналу images/<file> додатково виводить стиснений ключ
// images-compressed/<file>.webp (на випадок, якщо його немає у списку photosCompressed).
// Видалення відсутнього ключа не падає — безпечно для старих фото без стисненої версії.
async function deleteR2ObjectsForUrls(urls: string[]): Promise<void> {
  const keys = new Set<string>();
  for (const url of urls) {
    const key = keyFromUrl(url);
    if (!key) continue;
    keys.add(key);
    if (key.startsWith('images/')) {
      keys.add(`images-compressed/${key.slice('images/'.length)}.webp`);
    }
  }
  await Promise.all(
    [...keys].map((Key) =>
      r2Client
        .send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key }))
        .catch(() => {})
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const images = formData.getAll('file') as File[];
    const variationId = formData.get('variationId') as string;
    // Якщо replace=true — перезаписуємо фото варіації (старі видаляємо з R2),
    // інакше додаємо до наявних (поведінка за замовчуванням).
    const replace = formData.get('replace') === 'true';

    if (!images.length || !variationId) {
      return NextResponse.json({ error: 'No files or variationId' }, { status: 400 });
    }

    const { env } = getCloudflareContext();

    // 1. Завантажуємо всі картинки в R2 ПАРАЛЕЛЬНО.
    //    Для кожного фото: оригінал (для повноекранної галереї) + стиснена WebP-версія
    //    (для сторінки). Стиснення робимо ОДИН раз тут, через IMAGES-біндинг, а не на
    //    кожен запит сторінки — це і прибирає Cloudflare Error 1102.
    const uploadPromises = images.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());

      const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const fileKey = `images/${uniqueFilename}`;

      // Оригінал
      await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: file.type,
      }));
      const originalUrl = `${process.env.R2_PUBLIC_DOMAIN}/${fileKey}`;

      // Стиснена версія. Якщо біндинг відмовить (напр. завеликий оригінал) —
      // тихо відкочуємось на оригінал, щоб сторінка все одно відображалась.
      let compressedUrl = originalUrl;
      try {
        if (!env.IMAGES) throw new Error('IMAGES binding unavailable');
        const result = await env.IMAGES
          .input(new Blob([buffer]).stream())
          .transform({ width: 1600, fit: 'scale-down' })
          .output({ format: 'image/webp', quality: 80 });
        const compressedBuffer = Buffer.from(await new Response(result.image()).arrayBuffer());

        const compressedKey = `images-compressed/${uniqueFilename}.webp`;
        await r2Client.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: compressedKey,
          Body: compressedBuffer,
          ContentType: 'image/webp',
        }));
        compressedUrl = `${process.env.R2_PUBLIC_DOMAIN}/${compressedKey}`;
      } catch (compressError) {
        console.error('Image compression failed, falling back to original:', compressError);
      }

      return { originalUrl, compressedUrl };
    });

    const uploadResults = await Promise.all(uploadPromises);
    const newOriginalUrls = uploadResults.map((r) => r.originalUrl);
    const newCompressedUrls = uploadResults.map((r) => r.compressedUrl);

    // 2. Оновлюємо Airtable: оригінали + стиснені (паралельні масиви, той самий порядок).
    const record = await tableVariants.find(variationId);

    if (replace) {
      // Прибираємо старі об'єкти з R2, щоб не лишати сиріт, і ПЕРЕЗАПИСУЄМО поля лише новими URL.
      await deleteR2ObjectsForUrls([
        ...splitUrls(record.get(FIELDS.variant.photos)),
        ...splitUrls(record.get(FIELDS.variant.photosCompressed)),
      ]);
      await tableVariants.update(variationId, {
        [FIELDS.variant.photos]: newOriginalUrls.join('\n'),
        [FIELDS.variant.photosCompressed]: newCompressedUrls.join('\n'),
      });
    } else {
      await tableVariants.update(variationId, {
        [FIELDS.variant.photos]: mergeUrls(record.get(FIELDS.variant.photos), newOriginalUrls),
        [FIELDS.variant.photosCompressed]: mergeUrls(record.get(FIELDS.variant.photosCompressed), newCompressedUrls),
      });
    }

    return NextResponse.json({
      success: true,
      addedUrls: newOriginalUrls,
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

    // Стиснена версія детерміновано виводиться з ключа оригіналу:
    // images/<file>  ->  images-compressed/<file>.webp
    const compressedKey = fileKey.startsWith('images/')
      ? `images-compressed/${fileKey.slice('images/'.length)}.webp`
      : null;
    const compressedUrl = compressedKey
      ? `${process.env.R2_PUBLIC_DOMAIN}/${compressedKey}`
      : null;

    // 2. Видаляємо оригінал і стиснену версію з Cloudflare R2.
    //    Видалення відсутнього ключа не падає — це безпечно для старих фото без стисненої версії.
    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    }));
    if (compressedKey) {
      await r2Client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: compressedKey,
      })).catch(() => {});
    }

    // 3. Оновлюємо Airtable: прибираємо лінк з обох полів.
    //    З photosCompressed прибираємо і стиснений URL, і сам оригінал (на випадок,
    //    коли стиснення колись відкотилось на оригінал).
    const record = await tableVariants.find(variantId);
    const removeUrls = (existing: unknown, urlsToRemove: string[]): string =>
      String(existing || '')
        .split('\n')
        .map((u) => u.trim())
        .filter((u) => u.length > 0 && !urlsToRemove.includes(u))
        .join('\n');

    await tableVariants.update(variantId, {
      [FIELDS.variant.photos]: removeUrls(record.get(FIELDS.variant.photos), [url.trim()]),
      [FIELDS.variant.photosCompressed]: removeUrls(
        record.get(FIELDS.variant.photosCompressed),
        [url.trim(), ...(compressedUrl ? [compressedUrl] : [])],
      ),
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