// Рендерить блок структурованих даних (JSON-LD) для пошукових систем.
// Server Component — без "use client".
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify безпечно екранує дані; <script> не парситься як HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
