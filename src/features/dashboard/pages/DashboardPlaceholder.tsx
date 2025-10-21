import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface DashboardPlaceholderProps {
    readonly title: string;
    readonly description?: string;
}

export const DashboardPlaceholder: React.FC<DashboardPlaceholderProps> = ({
    title,
    description
}) => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                {title}
            </Typography>
            {description ? (
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    {description}
                </Typography>
            ) : null}
            <Box
                sx={{
                    display: 'grid',
                    gap: 3,
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                    mt: 1
                }}
            >
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6">More features coming soon</Typography>
                    <Typography variant="body2" color="text.secondary">
                        We are working hard to bring collaborative workflows, richer analytics, and
                        real-time updates to this area. Stay tuned!
                    </Typography>
                </Paper>
            </Box>
        </Box>
    );
};
