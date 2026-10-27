import { describe, expect, it } from "vitest";
import { buildCommentTree, countVisibleComments, formatCommentDate, type CommentView } from "@/lib/commentThread";

function comment(id: string, parentId: string | null, minute: number, extra: Partial<CommentView> = {}): CommentView {
  return {
    id,
    parentId,
    body: `Commentaire ${id}`,
    userName: `Lecteur ${id}`,
    canManage: false,
    createdAt: new Date(Date.UTC(2026, 9, 27, 12, minute)).toISOString(),
    likesCount: 0,
    ...extra
  };
}

describe("buildCommentTree", () => {
  it("imbrique les réponses de réponses dans l'ordre chronologique", () => {
    const tree = buildCommentTree([
      comment("c", "a", 3),
      comment("b", null, 2),
      comment("a", null, 1),
      comment("d", "c", 4)
    ]);

    expect(tree.map((node) => node.id)).toEqual(["a", "b"]);
    expect(tree[0].replies[0].id).toBe("c");
    expect(tree[0].replies[0].replyingTo).toBe("Lecteur a");
    expect(tree[0].replies[0].replies[0].id).toBe("d");
    expect(tree[0].descendantsCount).toBe(2);
  });

  it("remonte à la racine une réponse dont le parent n'est pas visible", () => {
    const [node] = buildCommentTree([comment("b", "masque", 1)]);

    expect(node.id).toBe("b");
    expect(node.parentUnavailable).toBe(true);
    expect(node.replyingTo).toBeNull();
  });

  it("garde un commentaire supprimé seulement s'il a encore des réponses", () => {
    const tree = buildCommentTree([
      comment("a", null, 1, { deleted: true }),
      comment("b", "a", 2),
      comment("c", null, 3, { deleted: true })
    ]);

    expect(tree.map((node) => node.id)).toEqual(["a"]);
    expect(tree[0].replies[0].replyingTo).toBeNull();
  });
});

describe("formatCommentDate", () => {
  const now = new Date(Date.UTC(2026, 9, 27, 12, 0));

  it("affiche une durée courte pour les commentaires récents", () => {
    expect(formatCommentDate(new Date(Date.UTC(2026, 9, 27, 11, 59, 30)).toISOString(), now)).toBe("à l'instant");
    expect(formatCommentDate(new Date(Date.UTC(2026, 9, 27, 11, 55)).toISOString(), now)).toBe("5 min");
    expect(formatCommentDate(new Date(Date.UTC(2026, 9, 27, 9, 0)).toISOString(), now)).toBe("3 h");
    expect(formatCommentDate(new Date(Date.UTC(2026, 9, 25, 12, 0)).toISOString(), now)).toBe("2 j");
  });

  it("affiche la date au-delà d'une semaine", () => {
    expect(formatCommentDate(new Date(Date.UTC(2026, 9, 12, 12, 0)).toISOString(), now)).toBe("12 oct.");
    expect(formatCommentDate(new Date(Date.UTC(2025, 9, 12, 12, 0)).toISOString(), now)).toBe("12 oct. 2025");
  });
});

describe("countVisibleComments", () => {
  it("ignore les commentaires supprimés", () => {
    expect(countVisibleComments([comment("a", null, 1, { deleted: true }), comment("b", "a", 2)])).toBe(1);
  });
});
