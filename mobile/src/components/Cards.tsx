import React from "react";
import { Animated, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, shadows, spacing, statusLabels } from "../theme";
import type { ActivityItem, Book, BookList, Reader, Review } from "../types";
import { PrimaryButton } from "./PrimaryButton";

function authorLine(book: Book) {
  return book.authors?.join(", ") || "Auteur inconnu";
}


function stableRatingStars(rating: number) {
  return String.fromCharCode(9733).repeat(Math.max(0, Math.min(5, Math.round(rating))));
}

export function BookPosterCard({ book, badge, onPress }: { book: Book; badge?: string | null; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.posterCard}>
      <View style={styles.posterCover}>
        {book.thumbnailUrl ? <Image source={{ uri: book.thumbnailUrl }} style={styles.coverImage} /> : <Text style={styles.coverFallback}>BookBox</Text>}
      </View>
      {badge ? <Text style={styles.posterBadge}>{badge}</Text> : null}
      <Text numberOfLines={2} style={styles.posterTitle}>{book.title}</Text>
      <Text numberOfLines={1} style={styles.posterMeta}>{authorLine(book)}</Text>
    </Pressable>
  );
}

export function BookHorizontalCard({
  book,
  badge,
  detail,
  actionLabel,
  isLoading,
  onAction,
  onPress
}: {
  book: Book;
  badge?: string | null;
  detail?: string | null;
  actionLabel?: string;
  isLoading?: boolean;
  onAction?: () => void;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.horizontalCard}>
      <View style={styles.horizontalCover}>
        {book.thumbnailUrl ? <Image source={{ uri: book.thumbnailUrl }} style={styles.coverImage} /> : <Text style={styles.coverFallback}>BB</Text>}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={styles.cardTitle}>{book.title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text numberOfLines={1} style={styles.cardMeta}>{authorLine(book)}</Text>
        {detail || book.publishedDate ? <Text numberOfLines={2} style={styles.cardDetail}>{detail ?? book.publishedDate}</Text> : null}
        {actionLabel && onAction ? (
          <View style={styles.cardAction}>
            <PrimaryButton compact isLoading={isLoading} label={actionLabel} onPress={onAction} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ActivityCard({ item, onBookPress }: { item: ActivityItem; onBookPress: (bookId: string) => void }) {
  const review = item.review;
  const entry = item.entry;
  const book = review?.book ?? entry?.book;
  const userName = review?.user?.name ?? entry?.user?.name ?? "Un lecteur";

  if (!book) return null;

  return (
    <View style={styles.activityCard}>
      <Text style={styles.activityText}>
        <Text style={styles.strong}>{userName}</Text>
        {review ? ` a publie une review ${review.rating}/5` : ` a marque ce livre en ${entry?.status ?? ""}`}
      </Text>
      <BookHorizontalCard
        book={book}
        detail={review?.body && !review.spoiler ? review.body : review?.spoiler ? "Review masquee: spoiler." : null}
        onPress={() => onBookPress(book.id)}
      />
    </View>
  );
}

export function ReviewCard({
  review,
  onReact,
  onComment,
  isSaving
}: {
  review: Review;
  onReact?: () => void;
  onComment?: (body: string) => void;
  isSaving?: boolean;
}) {
  const [comment, setComment] = React.useState("");
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const heartScale = React.useRef(new Animated.Value(1)).current;
  const body = review.spoiler ? "Cette review contient des spoilers." : review.body;
  const comments = review.comments ?? [];

  function handleReact() {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.45, friction: 3, tension: 220, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true })
    ]).start();
    onReact?.();
  }

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewUser}>{review.user?.name ?? "Lecteur BookBox"}</Text>
        <Text style={styles.rating}>{stableRatingStars(review.rating)}</Text>
      </View>
      {body ? <Text style={review.spoiler ? styles.spoilerText : styles.reviewBody}>{body}</Text> : <Text style={styles.cardMeta}>Note sans texte.</Text>}
      <View style={styles.reviewMetaRow}>
        <Text style={styles.cardMeta}>{review.reactions?.length ?? 0} reactions</Text>
        <Pressable onPress={() => setCommentsOpen((current) => !current)}>
          <Text style={styles.commentToggle}>{commentsOpen ? "Masquer" : "Voir"} {comments.length} commentaire{comments.length > 1 ? "s" : ""}</Text>
        </Pressable>
      </View>
      <View style={styles.reviewActions}>
        {onReact ? (
          <Pressable disabled={isSaving} onPress={handleReact} style={[styles.heartButton, isSaving ? styles.heartButtonDisabled : null]}>
            <Animated.Text style={[styles.heartText, { transform: [{ scale: heartScale }] }]}>{String.fromCharCode(9829)}</Animated.Text>
            <Text style={styles.heartLabel}>{isSaving ? "..." : "J'aime"}</Text>
          </Pressable>
        ) : null}
      </View>
      {onComment ? (
        <View style={styles.commentBox}>
          {commentsOpen ? (
            <View style={styles.commentList}>
              {comments.length ? comments.map((item) => (
                <View key={item.id} style={styles.commentItem}>
                  <Text style={styles.commentAuthor}>{item.user?.name ?? "Lecteur BookBox"}</Text>
                  <Text style={styles.commentBody}>{item.body}</Text>
                </View>
              )) : <Text style={styles.cardMeta}>Aucun commentaire pour le moment.</Text>}
            </View>
          ) : null}
          <CommentInput value={comment} onChange={setComment} />
          <PrimaryButton
            compact
            disabled={!comment.trim()}
            label="Commenter"
            onPress={() => {
              onComment(comment.trim());
              setCommentsOpen(true);
              setComment("");
            }}
            tone="ghost"
          />
        </View>
      ) : null}
    </View>
  );
}

function CommentInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <TextInput
      multiline
      onChangeText={onChange}
      placeholder="Ecrire un commentaire"
      placeholderTextColor={colors.subtle}
      style={styles.nativeInput}
      value={value}
    />
  );
}

export function UserCard({ reader, onPress, onFollow }: { reader: Reader; onPress: () => void; onFollow: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.userCard}>
      <View style={styles.avatar}>
        {reader.image ? <Image source={{ uri: reader.image }} style={styles.coverImage} /> : <Text style={styles.avatarText}>{(reader.name ?? reader.username ?? "B").slice(0, 1).toUpperCase()}</Text>}
      </View>
      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={styles.cardTitle}>{reader.name ?? reader.username ?? "Lecteur BookBox"}</Text>
        <Text style={styles.cardMeta}>{reader.counts.library} livres - {reader.counts.reviews} reviews - {reader.counts.followers} followers</Text>
      </View>
      <PrimaryButton compact label={reader.isFollowing ? "Ne plus suivre" : "Suivre"} onPress={onFollow} tone={reader.isFollowing ? "ghost" : "primary"} />
    </Pressable>
  );
}

export function ListCard({ list, onPress }: { list: BookList; onPress: () => void }) {
  const entries = list.entries ?? [];
  return (
    <Pressable onPress={onPress} style={styles.listCard}>
      <View style={styles.listCovers}>
        {entries.slice(0, 4).map((entry) => (
          <View key={entry.id} style={styles.listCover}>
            {entry.book.thumbnailUrl ? <Image source={{ uri: entry.book.thumbnailUrl }} style={styles.coverImage} /> : null}
          </View>
        ))}
      </View>
      <Text style={styles.cardTitle}>{list.title}</Text>
      <Text style={styles.cardMeta}>{list._count?.entries ?? entries.length} livres - {list.isPublic ? "publique" : "privee"}</Text>
      {list.description ? <Text numberOfLines={2} style={styles.cardDetail}>{list.description}</Text> : null}
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  return <Text style={styles.badge}>{statusLabels[status]}</Text>;
}

const styles = StyleSheet.create({
  posterCard: {
    width: 124
  },
  posterCover: {
    ...shadows.card,
    alignItems: "center",
    aspectRatio: 2 / 3,
    backgroundColor: colors.panelSoft,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden"
  },
  coverImage: {
    height: "100%",
    width: "100%"
  },
  coverFallback: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  posterBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.mint,
    borderRadius: radius.sm,
    color: colors.ink,
    fontSize: 10,
    fontWeight: "900",
    marginTop: spacing.sm,
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  posterTitle: {
    color: colors.paper,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.sm
  },
  posterMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3
  },
  horizontalCard: {
    ...shadows.card,
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  horizontalCover: {
    alignItems: "center",
    aspectRatio: 2 / 3,
    backgroundColor: colors.panelSoft,
    borderRadius: radius.sm,
    justifyContent: "center",
    overflow: "hidden",
    width: 68
  },
  cardBody: {
    flex: 1,
    gap: 5
  },
  titleRow: {
    gap: spacing.xs
  },
  cardTitle: {
    color: colors.paper,
    fontSize: 15,
    fontWeight: "900"
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  cardDetail: {
    color: colors.subtle,
    fontSize: 12,
    lineHeight: 18
  },
  badge: {
    alignSelf: "flex-start",
    borderColor: colors.mint,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.mint,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  cardAction: {
    alignSelf: "flex-start",
    marginTop: spacing.xs
  },
  activityCard: {
    backgroundColor: colors.night,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  activityText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  strong: {
    color: colors.paper,
    fontWeight: "900"
  },
  reviewCard: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  reviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  reviewUser: {
    color: colors.paper,
    fontWeight: "900"
  },
  rating: {
    color: colors.amber,
    fontWeight: "900"
  },
  reviewBody: {
    color: colors.muted,
    lineHeight: 21
  },
  spoilerText: {
    color: colors.coral,
    fontWeight: "800"
  },
  reviewMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  commentToggle: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17
  },
  reviewActions: {
    alignItems: "flex-start"
  },
  heartButton: {
    alignItems: "center",
    borderColor: colors.coral,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  heartButtonDisabled: {
    opacity: 0.65
  },
  heartText: {
    color: colors.coral,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20
  },
  heartLabel: {
    color: colors.paper,
    fontSize: 12,
    fontWeight: "900"
  },
  commentBox: {
    gap: spacing.sm
  },
  commentList: {
    gap: spacing.sm
  },
  commentItem: {
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: 3,
    padding: spacing.sm
  },
  commentAuthor: {
    color: colors.paper,
    fontSize: 12,
    fontWeight: "900"
  },
  commentBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  nativeInput: {
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.paper,
    minHeight: 74,
    padding: spacing.md,
    textAlignVertical: "top"
  },
  userCard: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    height: 46,
    justifyContent: "center",
    overflow: "hidden",
    width: 46
  },
  avatarText: {
    color: colors.ink,
    fontWeight: "900"
  },
  listCard: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  listCovers: {
    flexDirection: "row",
    height: 86,
    overflow: "hidden"
  },
  listCover: {
    backgroundColor: colors.panelSoft,
    borderColor: colors.ink,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden"
  }
});
