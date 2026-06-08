import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireCurrentUserId } from "@/server/auth/session";
import { apiError, notFound } from "@/server/http/errors";
import { commentMutationSchema } from "@/server/validation/reviews";

export async function PATCH(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { commentId } = await params;
    const input = commentMutationSchema.pick({ body: true }).parse(await request.json());
    const existing = await prisma.reviewComment.findUnique({ where: { id: commentId } });

    if (!existing) {
      throw notFound("Commentaire introuvable.", "COMMENT_NOT_FOUND");
    }

    if (existing.userId !== userId) {
      throw Object.assign(new Error("Tu ne peux modifier que ton commentaire."), { status: 403, code: "FORBIDDEN" });
    }

    const comment = await prisma.reviewComment.update({
      where: { id: commentId },
      data: { body: input.body },
      include: { user: true, likes: true }
    });

    return NextResponse.json(comment);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { commentId } = await params;
    const existing = await prisma.reviewComment.findUnique({ where: { id: commentId } });

    if (!existing) {
      throw notFound("Commentaire introuvable.", "COMMENT_NOT_FOUND");
    }

    if (existing.userId !== userId) {
      throw Object.assign(new Error("Tu ne peux supprimer que ton commentaire."), { status: 403, code: "FORBIDDEN" });
    }

    await prisma.reviewComment.delete({ where: { id: commentId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
