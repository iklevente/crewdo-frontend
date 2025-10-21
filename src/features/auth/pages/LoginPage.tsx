import React from 'react';
import { Container, Paper, Stack, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { LoginForm } from '../components/LoginForm';

export const LoginPage: React.FC = () => {
    return (
        <Container maxWidth="sm" sx={{ py: 12 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
                <Stack spacing={3} alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <ChatBubbleOutlineIcon color="primary" />
                        <Typography variant="h5" fontWeight={600}>
                            Crewdo
                        </Typography>
                    </Stack>
                    <LoginForm />
                </Stack>
            </Paper>
        </Container>
    );
};
