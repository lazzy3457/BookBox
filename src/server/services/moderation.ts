import { randomUUID } from "crypto";
import { prisma } from "@/server/db/prisma";
import { conflict, notFound } from "@/server/http/errors";
import type { ReportReason, ReportStatus, ReportTargetType } from "@/server/validation/moderation";
import type { ModerationAction } from "@/server/validation/moderation";
import { escapeEmailHtml, sendTransactionalEmail } from "@/server/email/mailer";

export type ModerationReportRow = {
  id: string;
  reporterId: string;
  reporterName: string | null;
  reporterUsername: string | null;
  reporterEmail: string | null;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  moderatorNote: string | null;
  decisionReason: string | null;
  action: ModerationAction;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

async function ensureReportableTarget(reporterId: string, targetType: ReportTargetType, targetId: string) {
  const ownerId = targetType === "USER"
    ? (await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }))?.id
    : targetType === "REVIEW"
      ? (await prisma.review.findUnique({ where: { id: targetId }, select: { userId: true } }))?.userId
      : (await prisma.reviewComment.findUnique({ where: { id: targetId }, select: { userId: true } }))?.userId;
  if (!ownerId) throw notFound("Le contenu signalé n’existe plus.", "REPORT_TARGET_NOT_FOUND");
  if (ownerId === reporterId) {
    throw Object.assign(new Error("Tu ne peux pas signaler ton propre contenu."), {
      status: 400,
      code: "SELF_REPORT_FORBIDDEN"
    });
  }
}

export async function createModerationReport(input: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string | null;
}) {
  await ensureReportableTarget(input.reporterId, input.targetType, input.targetId);
  const id = randomUUID();
  const now = new Date();
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "ModerationReport"
      ("id", "reporterId", "targetType", "targetId", "reason", "details", "status", "createdAt", "updatedAt")
    VALUES
      (${id}, ${input.reporterId}, ${input.targetType}::"ReportTargetType", ${input.targetId},
       ${input.reason}::"ReportReason", ${input.details || null}, 'OPEN'::"ReportStatus", ${now}, ${now})
    ON CONFLICT ("reporterId", "targetType", "targetId") DO NOTHING
    RETURNING "id"
  `;
  if (!rows.length) throw conflict("Tu as déjà signalé ce contenu.", "REPORT_ALREADY_EXISTS");
  return { id, status: "OPEN" as const };
}

export async function listModerationReports() {
  return prisma.$queryRaw<ModerationReportRow[]>`
    SELECT
      r."id", r."reporterId", u."name" AS "reporterName", u."username" AS "reporterUsername",
      u."email" AS "reporterEmail", r."targetType", r."targetId", r."reason", r."details",
      r."status", r."moderatorNote", r."decisionReason", r."action", r."resolvedAt", r."createdAt", r."updatedAt"
    FROM "ModerationReport" r
    JOIN "User" u ON u."id" = r."reporterId"
    ORDER BY
      CASE r."status" WHEN 'OPEN' THEN 0 WHEN 'REVIEWING' THEN 1 ELSE 2 END,
      r."createdAt" DESC
    LIMIT 250
  `;
}

export async function updateModerationReport(input: {
  id: string;
  moderatorId: string;
  status: ReportStatus;
  moderatorNote?: string | null;
  decisionReason?: string | null;
  action: ModerationAction;
}) {
  const now = new Date();
  const resolvedAt = input.status === "RESOLVED" || input.status === "DISMISSED" ? now : null;
  if (resolvedAt && !input.decisionReason?.trim()) {
    throw Object.assign(new Error("Une motivation est obligatoire pour clôturer le dossier."), { status: 400, code: "DECISION_REASON_REQUIRED" });
  }
  const report = await prisma.moderationReport.findUnique({ where: { id: input.id }, include: { reporter: { select: { email: true } } } });
  if (!report) throw notFound("Signalement introuvable.", "REPORT_NOT_FOUND");
  const allowedActions = report.targetType === "USER" ? ["NONE", "SUSPEND", "UNSUSPEND"] : ["NONE", "HIDE", "RESTORE"];
  if (!allowedActions.includes(input.action)) {
    throw Object.assign(new Error("Cette action ne correspond pas au type de contenu."), { status: 400, code: "INVALID_MODERATION_ACTION" });
  }
  const owner = report.targetType === "USER"
    ? await prisma.user.findUnique({ where: { id: report.targetId }, select: { email: true } })
    : report.targetType === "REVIEW"
      ? await prisma.review.findUnique({ where: { id: report.targetId }, select: { user: { select: { email: true } } } }).then((row) => row?.user ?? null)
      : await prisma.reviewComment.findUnique({ where: { id: report.targetId }, select: { user: { select: { email: true } } } }).then((row) => row?.user ?? null);

  await prisma.$transaction(async (transaction) => {
    if (report.targetType === "USER" && input.action === "SUSPEND") {
      await transaction.user.update({ where: { id: report.targetId }, data: { suspendedAt: now, suspensionReason: input.decisionReason } });
    } else if (report.targetType === "USER" && input.action === "UNSUSPEND") {
      await transaction.user.update({ where: { id: report.targetId }, data: { suspendedAt: null, suspensionReason: null } });
    } else if (report.targetType === "REVIEW" && (input.action === "HIDE" || input.action === "RESTORE")) {
      await transaction.review.update({ where: { id: report.targetId }, data: input.action === "HIDE" ? { hiddenAt: now, hiddenReason: input.decisionReason } : { hiddenAt: null, hiddenReason: null } });
    } else if (report.targetType === "COMMENT" && (input.action === "HIDE" || input.action === "RESTORE")) {
      await transaction.reviewComment.update({ where: { id: report.targetId }, data: input.action === "HIDE" ? { hiddenAt: now, hiddenReason: input.decisionReason } : { hiddenAt: null, hiddenReason: null } });
    }
    await transaction.moderationReport.update({
      where: { id: input.id },
      data: { status: input.status, moderatorNote: input.moderatorNote || null, decisionReason: input.decisionReason || null, action: input.action, resolvedAt }
    });
    if (input.action !== "NONE") {
      await transaction.moderationAction.create({
        data: { moderatorId: input.moderatorId, reportId: input.id, targetType: report.targetType, targetId: report.targetId, action: input.action, reason: input.decisionReason || input.moderatorNote || "Action de modération" }
      });
    }
  });

  if (resolvedAt && input.decisionReason) {
    const decisionReason = input.decisionReason;
    const recipients = new Set([report.reporter.email, owner?.email].filter((email): email is string => Boolean(email)));
    await Promise.all(Array.from(recipients).map((to) => sendTransactionalEmail({
      to,
      subject: "BooksBox — décision de modération",
      text: `${decisionReason}\nUne contestation peut être adressée via la page de signalement.`,
      html: `<p>${escapeEmailHtml(decisionReason)}</p><p>Une contestation peut être adressée via la page de signalement.</p>`
    }).catch(() => console.warn("[moderation] Decision email delivery failed."))));
  }
  return { id: input.id, status: input.status };
}
