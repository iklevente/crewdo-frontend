import React from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    type SelectChangeEvent
} from '@mui/material';
import type { NotificationQueryState } from '../types/notification';
import { getNotificationTypeOptions } from '../utils/notificationMeta';

interface NotificationFiltersProps {
    readonly filters: Pick<NotificationQueryState, 'type' | 'status'>;
    readonly onFiltersChange: (next: Pick<NotificationQueryState, 'type' | 'status'>) => void;
    readonly disabled?: boolean;
}

const typeOptions = getNotificationTypeOptions();

const isValidType = (value: string): value is NotificationQueryState['type'] => {
    if (value === 'all') {
        return true;
    }
    return typeOptions.some(option => option.value === value);
};

export const NotificationFilters: React.FC<NotificationFiltersProps> = ({
    filters,
    onFiltersChange,
    disabled
}) => {
    const handleTypeChange = (event: SelectChangeEvent<string>): void => {
        const candidate = event.target.value;
        const nextValue = isValidType(candidate) ? candidate : 'all';
        onFiltersChange({ type: nextValue, status: filters.status });
    };

    const handleStatusChange = (
        _event: React.MouseEvent<HTMLElement>,
        value: string | null
    ): void => {
        if (!value) {
            return;
        }
        const status: NotificationQueryState['status'] =
            value === 'read' ? 'read' : value === 'unread' ? 'unread' : 'all';
        onFiltersChange({ type: filters.type, status });
    };

    return (
        <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
        >
            <Box sx={{ minWidth: { xs: '100%', sm: 240 } }}>
                <FormControl fullWidth size="small" disabled={disabled}>
                    <InputLabel id="notification-type-filter-label">Type</InputLabel>
                    <Select
                        labelId="notification-type-filter-label"
                        label="Type"
                        value={filters.type ?? 'all'}
                        onChange={handleTypeChange}
                    >
                        <MenuItem value="all">All types</MenuItem>
                        {typeOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
            <ToggleButtonGroup
                value={filters.status}
                exclusive
                size="small"
                onChange={handleStatusChange}
                disabled={disabled}
            >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="unread">Unread</ToggleButton>
                <ToggleButton value="read">Read</ToggleButton>
            </ToggleButtonGroup>
        </Stack>
    );
};
