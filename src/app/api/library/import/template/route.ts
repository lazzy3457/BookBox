export async function GET() {
  const csv = "title,authors,isbn13,isbn10,status,rating,startedAt,finishedAt,review\nLe Petit Prince,Antoine de Saint-Exupéry,9782070612758,,READ,5,2026-01-02,2026-01-05,Un classique\n";
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="booksbox-import-template.csv"'
    }
  });
}
