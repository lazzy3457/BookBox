import { randomBytes, randomUUID } from "crypto";
import { prisma } from "@/server/db/prisma";
import { escapeEmailHtml, sendTransactionalEmail } from "@/server/email/mailer";

async function safeEmail(input: Parameters<typeof sendTransactionalEmail>[0]) {
  try {
    await sendTransactionalEmail(input);
  } catch {
    console.warn("[legal-notice] Transactional email delivery failed.");
  }
}

export async function createLegalNotice(input: {
  email: string;
  targetUrl: string;
  legalGround: string;
  explanation: string;
  goodFaith: true;
}) {
  const trackingCode = `BB-${randomBytes(9).toString("hex").toUpperCase()}`;
  const notice = await prisma.legalNotice.create({
    data: {
      id: randomUUID(),
      trackingCode,
      reporterEmail: input.email.toLowerCase(),
      targetUrl: input.targetUrl,
      legalGround: input.legalGround,
      explanation: input.explanation,
      goodFaith: input.goodFaith
    }
  });
  await safeEmail({
    to: notice.reporterEmail,
    subject: `BooksBox — signalement ${trackingCode}`,
    text: `Ton signalement a été reçu. Code de suivi : ${trackingCode}.`,
    html: `<p>Ton signalement a été reçu.</p><p>Code de suivi : <strong>${trackingCode}</strong></p>`
  });
  return { trackingCode };
}

export async function getLegalNoticeStatus(trackingCode: string, email: string) {
  return prisma.legalNotice.findFirst({
    where: { trackingCode, reporterEmail: email.toLowerCase() },
    select: { trackingCode: true, status: true, decisionReason: true, action: true, createdAt: true, resolvedAt: true }
  });
}

export async function createAppeal(input: { trackingCode: string; email: string; reason: string }) {
  const notice = await prisma.legalNotice.findFirst({ where: { trackingCode: input.trackingCode, reporterEmail: input.email.toLowerCase() } });
  if (!notice) return null;
  return prisma.moderationAppeal.create({
    data: { id: randomUUID(), legalNoticeId: notice.id, email: input.email.toLowerCase(), reason: input.reason }
  });
}

export async function listLegalNotices() {
  return prisma.legalNotice.findMany({ include: { appeals: { orderBy: { createdAt: "desc" } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 250 });
}

export async function decideLegalNotice(id: string, input: { status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED"; decisionReason?: string | null }) {
  const notice = await prisma.legalNotice.update({
    where: { id },
    data: {
      status: input.status,
      decisionReason: input.decisionReason || null,
      resolvedAt: input.status === "RESOLVED" || input.status === "DISMISSED" ? new Date() : null
    }
  });
  if (notice.decisionReason && notice.resolvedAt) {
    await safeEmail({
      to: notice.reporterEmail,
      subject: `BooksBox — décision ${notice.trackingCode}`,
      text: `${notice.decisionReason}\nTu peux contester cette décision depuis la page de suivi.`,
      html: `<p>${escapeEmailHtml(notice.decisionReason)}</p><p>Tu peux contester cette décision depuis la page de suivi.</p>`
    });
  }
  return notice;
}
