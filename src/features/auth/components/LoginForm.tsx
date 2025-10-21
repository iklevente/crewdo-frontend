import React from 'react';
import { useForm } from 'react-hook-form';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { NavLink } from 'react-router-dom';
import type { LoginDto } from 'api/models/login-dto';
import { useLoginMutation } from '../hooks/useAuthMutations';

type LoginFormValues = LoginDto;

export const LoginForm: React.FC = () => {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<LoginFormValues>({
        defaultValues: {
            email: '',
            password: ''
        }
    });

    const loginMutation = useLoginMutation();

    const onSubmit = (values: LoginFormValues): void => {
        loginMutation.mutate(values);
    };

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
        void handleSubmit(onSubmit)(event);
    };

    return (
        <Box component="form" onSubmit={handleFormSubmit} noValidate>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Log in
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Enter your credentials to access Crewdo.
                    </Typography>
                </Box>
                <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    fullWidth
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message ?? ''}
                    {...register('email', {
                        required: 'Email is required'
                    })}
                />
                <TextField
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    fullWidth
                    error={Boolean(errors.password)}
                    helperText={errors.password?.message ?? ''}
                    {...register('password', {
                        required: 'Password is required'
                    })}
                />
                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loginMutation.isPending}
                >
                    {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                </Button>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    New to Crewdo? <NavLink to="/register">Create an account</NavLink>
                </Typography>
            </Stack>
        </Box>
    );
};
