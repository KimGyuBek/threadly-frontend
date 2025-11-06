export interface PostAuthor {
  userId: string;
  nickname: string;
  profileImageUrl?: string;
}

export interface PostImage {
  imageId: string;
  imageUrl: string;
  imageOrder: number;
}

export interface FeedPost {
  postId: string;
  userId: string;
  content: string;
  viewCount: number;
  status: string;
  postedAt: string;
  author: PostAuthor;
  images: PostImage[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export interface PostComment {
  postId: string;
  commentId: string;
  commenter: PostAuthor;
  commentedAt: string;
  likeCount: number;
  content: string;
  liked: boolean;
}

export interface PostCommentsPage {
  comments: PostComment[];
  nextCursor: { cursorTimestamp: string | null; cursorId: string | null } | null;
  unauthorized?: boolean;
}

export interface PostsCursor {
  timestamp: string;
  id: string;
}

export interface FeedResponse {
  content: FeedPost[];
  hasNext: boolean;
  nextCursor?: PostsCursor;
}

export interface CreatePostPayload {
  content: string;
}
