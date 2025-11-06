import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

jest.mock('features/messages/components/EmojiPicker', () => ({
    EmojiPicker: ({ onSelect }: { onSelect: (emoji: string) => void }) => (
        <button type="button" data-testid="emoji-picker-mock" onClick={() => onSelect('😀')}>
            Emoji Picker
        </button>
    )
}));

import { MessageList } from '../MessageList';
import type { Message } from '../../../messages/types/message';

const theme = createTheme();

const wrapper: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const createMessage = (overrides: Partial<Message> = {}): Message => {
    const now = new Date('2025-01-01T10:00:00Z').toISOString();
    return {
        id: 'message-1',
        content: 'Hello world',
        createdAt: now,
        updatedAt: now,
        editedAt: now,
        isEdited: false,
        isDeleted: false,
        author: {
            id: 'author-1',
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com'
        },
        channel: {
            id: 'channel-1',
            name: 'General',
            type: 'PUBLIC'
        },
        parentMessage: undefined,
        attachments: [],
        reactions: [],
        ...overrides
    };
};

describe('MessageList', () => {
    let originalScrollIntoView: ((this: Element, arg?: boolean | ScrollIntoViewOptions) => void) | undefined;

    beforeAll(() => {
        originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    afterAll(() => {
        if (originalScrollIntoView) {
            window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
        }
    });

    it('renders all provided messages', () => {
        const props = {
            hasMore: false,
            isLoadingMore: false,
            isInitialLoading: false,
            onLoadMore: jest.fn(async () => undefined),
            currentUserId: 'author-1',
            onReply: jest.fn(),
            onToggleReaction: jest.fn(async () => undefined),
            onEdit: jest.fn(async () => undefined),
            onDelete: jest.fn(async () => undefined),
            onUserClick: jest.fn(),
            onHighlightEnd: jest.fn()
        };
        const messages = [createMessage({ content: 'First message' }), createMessage({ id: 'message-2', content: 'Second message' })];

        render(<MessageList {...props} messages={messages} />, { wrapper });

        expect(screen.getByText('First message')).toBeInTheDocument();
        expect(screen.getByText('Second message')).toBeInTheDocument();
    });

    it('updates the DOM when a new message is added', () => {
        const props = {
            hasMore: false,
            isLoadingMore: false,
            isInitialLoading: false,
            onLoadMore: jest.fn(async () => undefined),
            currentUserId: 'author-1',
            onReply: jest.fn(),
            onToggleReaction: jest.fn(async () => undefined),
            onEdit: jest.fn(async () => undefined),
            onDelete: jest.fn(async () => undefined),
            onUserClick: jest.fn(),
            onHighlightEnd: jest.fn()
        };
        const initialMessages = [createMessage({ content: 'Existing message' })];
        const { rerender } = render(<MessageList {...props} messages={initialMessages} />, { wrapper });

        expect(screen.getByText('Existing message')).toBeInTheDocument();

        const updatedMessages = [
            ...initialMessages,
            createMessage({ id: 'message-2', content: 'Fresh message' })
        ];

    rerender(<MessageList {...props} messages={updatedMessages} />);

        expect(screen.getByText('Fresh message')).toBeInTheDocument();
    });
});
