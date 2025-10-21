import React from 'react';
import 'emoji-picker-element';

interface EmojiPickerClickEvent extends Event {
    detail: {
        unicode: string;
    };
}

interface EmojiPickerProps {
    readonly onSelect: (emoji: string) => void;
    readonly autoFocus?: boolean;
}

/**
 * Wraps the emoji-picker-element web component so React components can render
 * a full Unicode emoji selector and react to selections.
 */
export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, autoFocus }) => {
    const pickerRef = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
        const picker = pickerRef.current;
        if (!picker) {
            return;
        }

        const handleEmojiClick = (event: Event): void => {
            const { detail } = event as EmojiPickerClickEvent;
            const { unicode } = detail;
            if (unicode) {
                onSelect(unicode);
            }
        };

        picker.addEventListener('emoji-click', handleEmojiClick as EventListener);

        if (autoFocus) {
            // Focus the internal search input when requested so users can type immediately.
            window.setTimeout(() => {
                const searchInput = picker.shadowRoot?.querySelector('input[type="search"]');
                if (searchInput instanceof HTMLInputElement) {
                    searchInput.focus();
                }
            }, 0);
        }

        return () => {
            picker.removeEventListener('emoji-click', handleEmojiClick as EventListener);
        };
    }, [onSelect, autoFocus]);

    return React.createElement('emoji-picker', {
        ref: pickerRef as React.RefObject<HTMLElement>,
        style: { width: 320, height: 360 },
        'data-testid': 'emoji-picker'
    });
};
