import React from 'react';
import {
    Autocomplete,
    Avatar,
    Checkbox,
    Chip,
    ListItemIcon,
    ListItemText,
    TextField,
    type AutocompleteRenderGetTagProps
} from '@mui/material';

interface ParticipantOption {
    readonly id: string;
    readonly name: string;
    readonly email?: string;
}

interface CallParticipantSelectorProps {
    readonly value: string[];
    readonly onChange: (next: string[]) => void;
    readonly options: ParticipantOption[];
    readonly disabled?: boolean;
    readonly label?: string;
    readonly helperText?: string;
}

const renderTags = (
    value: ParticipantOption[],
    getTagProps: AutocompleteRenderGetTagProps
): React.ReactNode =>
    value.map((option, index) => {
        const { key, ...chipProps } = getTagProps({ index });
        return (
            <Chip
                key={key}
                label={option.name}
                size="small"
                {...chipProps}
                sx={{ maxWidth: 160 }}
            />
        );
    });

const renderOption = (
    props: React.HTMLAttributes<HTMLLIElement>,
    option: ParticipantOption,
    selected: boolean
): React.ReactNode => {
    const { key, ...optionProps } = props as typeof props & { key?: string };
    return (
        <li key={key} {...optionProps}>
            <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox edge="start" checked={selected} tabIndex={-1} disableRipple />
            </ListItemIcon>
            <Avatar sx={{ width: 28, height: 28, mr: 1.5 }}>
                {option.name
                    .split(' ')
                    .map(part => part.charAt(0))
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
            </Avatar>
            <ListItemText
                primary={option.name}
                secondary={option.email}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
            />
        </li>
    );
};

export const CallParticipantSelector: React.FC<CallParticipantSelectorProps> = ({
    value,
    onChange,
    options,
    disabled,
    label = 'Invite teammates',
    helperText
}) => {
    const optionLookup = React.useMemo(
        () => new Map(options.map(option => [option.id, option])),
        [options]
    );

    const selectedOptions = React.useMemo(
        () =>
            value
                .map(id => optionLookup.get(id))
                .filter((item): item is ParticipantOption => Boolean(item)),
        [optionLookup, value]
    );

    return (
        <Autocomplete
            multiple
            options={options}
            disableCloseOnSelect
            getOptionLabel={option => option.name}
            value={selectedOptions}
            onChange={(_, next) => onChange(next.map(item => item.id))}
            renderInput={params => (
                <TextField
                    {...params}
                    label={label}
                    placeholder="Search teammates"
                    helperText={helperText}
                />
            )}
            renderTags={renderTags}
            renderOption={(props, option, { selected }) => renderOption(props, option, selected)}
            disabled={disabled}
        />
    );
};
