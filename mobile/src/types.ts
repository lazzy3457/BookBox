export type ReadingStatus = "TO_READ" | "READING" | "READ" | "ABANDONED";
export type ReactionKind = "LIKE" | "TO_READ";

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
  reactions?: unknown[];
  comments?: unknown[];
};

export type BookList = {
  id: string;
  title: string;
  description?: string | null;
  rating?: number | null;
  isPublic: boolean;
  entries?: Array<{ id: string; bookId: string; note?: string | null; book: Book }>;
  _count?: { entries: number };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  BookDetails: { bookId: string };
  AuthorDetails: { authorSlug: string; authorName?: string };
  ListDetails: { listId: string };
  PublicProfile: { userId: string };
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
