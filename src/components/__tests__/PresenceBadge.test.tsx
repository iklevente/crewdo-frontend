import React from 'react';
import { render, screen } from '@testing-library/react';
import { PresenceBadge } from '../PresenceBadge';

describe('PresenceBadge', () => {
    it('shows Offline indicator when status is missing', () => {
        render(<PresenceBadge />);

        expect(screen.getByText('Offline')).toBeInTheDocument();
        expect(screen.getByTestId('presence-indicator')).toHaveStyle({
            backgroundColor: '#9e9e9e'
        });
    });

    it('renders normalized label and custom message for provided status', () => {
        render(<PresenceBadge status="ONLINE" customStatus="Working remotely" />);

        expect(screen.getByText('Online • Working remotely')).toBeInTheDocument();
        expect(screen.getByTestId('presence-indicator')).toHaveStyle({
            backgroundColor: '#4caf50'
        });
    });
});
