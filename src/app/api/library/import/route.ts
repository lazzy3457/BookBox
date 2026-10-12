import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { commitLibraryImport, MAX_IMPORT_BYTES, parseLibraryImport, previewLibraryImport } from "@/server/services/libraryImport";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { z } from "zod";

const importActionSchema = z.enum(["preview", "confirm"]);
const resolutionsSchema = z.record(z.string(), z.enum(["keep", "import"]));

function parseResolutions(value: FormDataEntryValue | null) {
  try {
    return resolutionsSchema.parse(JSON.parse(String(value || "{}")));
  } catch {
    throw Object.assign(new Error("Les choix de résolution de l’import sont invalides."), {
      status: 400,
      code: "INVALID_IMPORT_RESOLUTIONS"
    });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({
      scope: "library-import",
      identifier: userId,
      limit: 5,
      windowMs: 60 * 60_000
    });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw Object.assign(new Error("Choisis un fichier CSV."), { status: 400 });
    if (file.size > MAX_IMPORT_BYTES) throw Object.assign(new Error("Le fichier dépasse 2 Mo."), { status: 400 });
    if (!file.name.toLowerCase().endsWith(".csv")) throw Object.assign(new Error("Seuls les fichiers CSV sont acceptés."), { status: 400 });
    const action = importActionSchema.parse(String(form.get("action") || "preview"));
    const rows = parseLibraryImport(await file.text());
    const preview = await previewLibraryImport(userId, rows);
    if (action === "confirm") {
      const resolutions = parseResolutions(form.get("resolutions"));
      const summary = await commitLibraryImport(userId, preview, resolutions);
      return NextResponse.json({ summary });
    }
    return NextResponse.json({
      preview,
      summary: {
        new: preview.filter((row) => row.state === "new").length,
        matches: preview.filter((row) => row.state === "match").length,
        conflicts: preview.filter((row) => row.state === "conflict").length,
        invalid: preview.filter((row) => row.state === "invalid").length
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
