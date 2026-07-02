export type ReadingStatus = "TO_READ" | "READING" | "READ" | "ABANDONED";
export type ReactionKind = "LIKE" | "TO_READ";
export type NotificationType =
  | "REVIEW_LIKE"
  | "COMMENT_LIKE"
  | "REVIEW_COMMENT"
  | "COMMENT_REPLY"
  | "FRIEND_REVIEW"
  | "NEW_FOLLOWER";

export type User = {
  id: string;
  name: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
  bio?: string | null;
};

export type Book = {
  id: string;
  externalId?: string;
  source?: string;
  googleBooksVolumeId?: string;
  openLibraryKey?: string;
  isbn10?: string[];
  isbn13?: string[];
  title: string;
  authors: string[];
  description?: string | null;
  thumbnailUrl?: string | null;
  publishedDate?: string | null;
  publisher?: string | null;
  pageCount?: number | null;
  language?: string | null;
  averageRating?: number | null;
};

export type LibraryItem = {
  id: string;
  status: ReadingStatus;
  isFavorite: boolean;
  updatedAt: string;
  book: Book;
};

export type Review = {
  id: string;
  bookId: string;
  userId: string;
  rating: number;
  body?: string | null;
  spoiler: boolean;
  user?: User;
  book?: Book;
  reactions?: ReviewReaction[];
  comments?: ReviewComment[];
  createdAt?: string;
  updatedAt?: string;
};

export type ReviewReaction = {
  id: string;
  reviewId: string;
  userId: string;
  kind: ReactionKind;
};

export type ReviewComment = {
  id: string;
  reviewId?: string;
  userId?: string;
  body: string;
  createdAt: string;
  user?: User;
  likes?: unknown[];
};

export type NotificationPreference = {
  id: string;
  userId: string;
  enabled: boolean;
  likesEnabled: boolean;
  commentsEnabled: boolean;
  friendReviewsEnabled: boolean;
  followersEnabled: boolean;
};

export type BookBoxNotification = {
  id: string;
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  targetUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
  actor?: User | null;
};

export type BookList = {
  id: string;
  title: string;
  description?: string | null;
  rating?: number | null;
  isPublic: boolean;
  entries?: Array<{ id: string; bookId: string; note?: string | null; book: Book & { reviews?: Review[] } }>;
  _count?: { entries: number };
};

export type ActivityItem = {
  id: string;
  type: "review" | "library";
  review?: Review & { book: Book; user: User };
  entry?: LibraryItem & { user: User };
};

export type Reader = User & {
  isFollowing: boolean;
  counts: { library: number; reviews: number; followers: number };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  BookDetails: { bookId: string };
  AuthorDetails: { authorSlug: string; authorName?: string };
  ListDetails: { listId: string };
  PublicProfile: { userId: string };
  Notifications: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
  Community: undefined;
  Profile: undefined;
};
