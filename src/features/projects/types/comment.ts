import type { CommentResponseDto } from 'api/models/comment-response-dto';

interface TaskCommentAuthor {
    readonly id: string;
    readonly firstName: string | null;
    readonly lastName: string | null;
    readonly email: string;
    readonly profilePicture?: string | null;
}

export interface TaskComment {
    readonly id: string;
    readonly content: string;
    readonly isEdited: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly author: TaskCommentAuthor;
}

interface AuthorPayload {
    id?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    profilePicture?: unknown;
}

const normalizeAuthor = (payload: AuthorPayload | undefined): TaskCommentAuthor => {
    const author: AuthorPayload = payload ?? {};
    const { id, firstName, lastName, email, profilePicture: profileValue } = author;
    let profilePicture: string | null = null;
    if (typeof profileValue === 'string') {
        profilePicture = profileValue;
    } else if (profileValue === null) {
        profilePicture = null;
    }
    return {
        id: typeof id === 'string' ? id : '',
        firstName: typeof firstName === 'string' ? firstName : null,
        lastName: typeof lastName === 'string' ? lastName : null,
        email: typeof email === 'string' ? email : '',
        profilePicture
    };
};

export const mapCommentResponse = (payload: CommentResponseDto): TaskComment => ({
    id: payload.id,
    content: payload.content,
    isEdited: payload.isEdited,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    author: normalizeAuthor(payload.author as AuthorPayload | undefined)
});
