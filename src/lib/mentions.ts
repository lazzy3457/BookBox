// Pseudos mentionnés dans un message (« @camille »), en minuscules et sans doublon.
// Ce module ne doit rien importer : il est testé sans base de données.
export function extractMentions(text: string | null | undefined, limit = 10) {
  if (!text) return [];
  const found = new Set<string>();
  for (const match of text.matchAll(/(^|[^\w@])@([a-zA-Z0-9_]{3,32})\b/g)) {
    found.add(match[2].toLowerCase());
    if (found.size >= limit) break;
  }
  return [...found];
}
