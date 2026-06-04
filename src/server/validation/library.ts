import { ReadingStatus } from "@prisma/client";
import { z } from "zod";

export const libraryMutationSchema = z.object({
  bookId: z.string().min(1),
  status: z.nativeEnum(ReadingStatus)
});
