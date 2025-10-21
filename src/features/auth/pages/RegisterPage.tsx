import React from 'react';
import { Container, Paper, Stack, Typography } from '@mui/material';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import { RegisterForm } from '../components/RegisterForm';

export const RegisterPage: React.FC = () => {
    return (
        <Container maxWidth="sm" sx={{ py: 12 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
                <Stack spacing={3} alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <EmojiPeopleIcon color="primary" />
                        <Typography variant="h5" fontWeight={600}>
                            Join Crewdo
                        </Typography>
                    </Stack>
                    <RegisterForm />
                </Stack>
            </Paper>
        </Container>
    );
};
