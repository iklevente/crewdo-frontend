import type React from 'react';

declare global {
    interface EmojiPickerClickDetail {
        unicode?: string;
        name?: string;
        slug?: string;
        shortcodes?: string[];
    }

    interface EmojiPickerClickEvent extends Event {
        detail?: EmojiPickerClickDetail;
    }

    namespace JSX {
        interface IntrinsicElements {
            'emoji-picker': React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement>,
                HTMLElement
            > & {
                ref?: React.Ref<HTMLElement>;
                'data-testid'?: string;
            };
        }
    }
}

export {};
