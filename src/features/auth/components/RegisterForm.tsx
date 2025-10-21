import React from 'react';
import { useForm } from 'react-hook-form';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { NavLink } from 'react-router-dom';
import type { RegisterDto } from 'api/models/register-dto';
import { useRegisterMutation } from '../hooks/useAuthMutations';

type RegisterFormValues = RegisterDto;

export const RegisterForm: React.FC = () => {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<RegisterFormValues>({
        defaultValues: {
            email: '',
            password: '',
            firstName: '',
            lastName: ''
        }
    });

    const registerMutation = useRegisterMutation();

    const onSubmit = (values: RegisterFormValues): void => {
        registerMutation.mutate(values);
    };

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
        void handleSubmit(onSubmit)(event);
    };

    return (
        <Box component="form" onSubmit={handleFormSubmit} noValidate>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Create an account
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Start collaborating with your team in minutes.
                    </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        label="First name"
                        fullWidth
                        autoComplete="given-name"
                        error={Boolean(errors.firstName)}
                        helperText={errors.firstName?.message ?? ''}
                        {...register('firstName', {
                            required: 'First name is required'
                        })}
                    />
                    <TextField
                        label="Last name"
                        fullWidth
                        autoComplete="family-name"
                        error={Boolean(errors.lastName)}
                        helperText={errors.lastName?.message ?? ''}
                        {...register('lastName', {
                            required: 'Last name is required'
                        })}
                    />
                </Stack>
                <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    autoComplete="email"
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message ?? ''}
                    {...register('email', {
                        required: 'Email is required'
                    })}
                />
                <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    autoComplete="new-password"
                    error={Boolean(errors.password)}
                    helperText={errors.password?.message ?? ''}
                    {...register('password', {
                        required: 'Password is required',
                        minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters'
                        }
                    })}
                />
                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={registerMutation.isPending}
                >
                    {registerMutation.isPending ? 'Creating account...' : 'Create account'}
                </Button>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Already have an account? <NavLink to="/login">Log in</NavLink>
                </Typography>
            </Stack>
        </Box>
    );
};
