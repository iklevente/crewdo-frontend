import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    Paper,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile';
import { useUpdateCurrentUserProfile } from '../hooks/useUpdateCurrentUserProfile';
import { useChangePassword } from '../hooks/useChangePassword';

interface ProfileFormValues {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly phoneNumber: string;
    readonly department: string;
    readonly position: string;
}

interface PasswordFormValues {
    readonly currentPassword: string;
    readonly newPassword: string;
    readonly confirmPassword: string;
}

const emptyProfileValues: ProfileFormValues = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: '',
    position: ''
};

const emptyPasswordValues: PasswordFormValues = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
};

export const SettingsPage: React.FC = () => {
    const { profile, isLoading, isError, refetch } = useCurrentUserProfile();
    const { updateProfile, isPending: isProfileUpdating } = useUpdateCurrentUserProfile();
    const { changePassword, isPending: isPasswordUpdating } = useChangePassword();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors: profileErrors, isDirty: isProfileDirty }
    } = useForm<ProfileFormValues>({
        defaultValues: emptyProfileValues
    });

    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        reset: resetPasswordForm,
        setError: setPasswordError,
        formState: { errors: passwordErrors }
    } = useForm<PasswordFormValues>({
        defaultValues: emptyPasswordValues
    });

    React.useEffect(() => {
        if (!profile) {
            reset(emptyProfileValues);
            return;
        }

        reset({
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            phoneNumber: profile.phoneNumber ?? '',
            department: profile.department ?? '',
            position: profile.position ?? ''
        });
    }, [profile, reset]);

    const onSubmitProfile = handleSubmit(async values => {
        try {
            const updated = await updateProfile({
                firstName: values.firstName,
                lastName: values.lastName,
                phoneNumber: values.phoneNumber,
                department: values.department,
                position: values.position
            });

            reset({
                firstName: updated.firstName,
                lastName: updated.lastName,
                email: updated.email,
                phoneNumber: updated.phoneNumber ?? '',
                department: updated.department ?? '',
                position: updated.position ?? ''
            });
        } catch (error) {
            console.warn('Profile update failed', error);
        }
    });

    const onSubmitPassword = handlePasswordSubmit(async values => {
        if (values.newPassword !== values.confirmPassword) {
            setPasswordError('confirmPassword', {
                type: 'validate',
                message: 'Passwords do not match'
            });
            return;
        }

        if (values.newPassword.trim().length < 6) {
            setPasswordError('newPassword', {
                type: 'minLength',
                message: 'Password should be at least 6 characters'
            });
            return;
        }

        try {
            await changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword
            });
            resetPasswordForm(emptyPasswordValues);
        } catch (error) {
            console.warn('Password update failed', error);
        }
    });

    const handleProfileFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
        void onSubmitProfile(event);
    };

    const handlePasswordFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
        void onSubmitPassword(event);
    };

    if (isLoading && !profile) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (isError && !profile) {
        return (
            <Paper sx={{ p: 4 }}>
                <Stack spacing={2} alignItems="flex-start">
                    <Alert severity="error" sx={{ width: '100%' }}>
                        Unable to load your settings right now.
                    </Alert>
                    <Button
                        variant="contained"
                        onClick={() => {
                            void refetch();
                        }}
                    >
                        Retry
                    </Button>
                </Stack>
            </Paper>
        );
    }

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h4" gutterBottom>
                    Account Settings
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Update your profile information and keep your credentials secure.
                </Typography>
            </Box>

            <Paper component="form" onSubmit={handleProfileFormSubmit} sx={{ p: 3 }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h6">Profile</Typography>
                        <Typography variant="body2" color="text.secondary">
                            These details are visible to your teammates.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gap: 2,
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
                        }}
                    >
                        <TextField
                            label="First name"
                            fullWidth
                            required
                            {...register('firstName', { required: 'First name is required' })}
                            error={Boolean(profileErrors.firstName)}
                            helperText={profileErrors.firstName?.message}
                        />
                        <TextField
                            label="Last name"
                            fullWidth
                            required
                            {...register('lastName', { required: 'Last name is required' })}
                            error={Boolean(profileErrors.lastName)}
                            helperText={profileErrors.lastName?.message}
                        />
                        <TextField label="Email" fullWidth disabled {...register('email')} />
                        <TextField
                            label="Phone number"
                            fullWidth
                            placeholder="+1 555 0100"
                            {...register('phoneNumber')}
                        />
                        <TextField
                            label="Department"
                            fullWidth
                            placeholder="e.g. Engineering"
                            {...register('department')}
                        />
                        <TextField
                            label="Position"
                            fullWidth
                            placeholder="e.g. Senior Developer"
                            {...register('position')}
                        />
                    </Box>

                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button
                            type="button"
                            onClick={() => {
                                const formValues = profile
                                    ? {
                                          firstName: profile.firstName,
                                          lastName: profile.lastName,
                                          email: profile.email,
                                          phoneNumber: profile.phoneNumber ?? '',
                                          department: profile.department ?? '',
                                          position: profile.position ?? ''
                                      }
                                    : emptyProfileValues;
                                reset(formValues);
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={!isProfileDirty || isProfileUpdating}
                        >
                            {isProfileUpdating ? 'Saving…' : 'Save changes'}
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            <Paper component="form" onSubmit={handlePasswordFormSubmit} sx={{ p: 3 }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h6">Security</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Update your password regularly to protect your account.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gap: 2,
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
                        }}
                    >
                        <TextField
                            label="Current password"
                            type="password"
                            fullWidth
                            autoComplete="current-password"
                            required
                            {...registerPassword('currentPassword', {
                                required: 'Current password is required'
                            })}
                            error={Boolean(passwordErrors.currentPassword)}
                            helperText={passwordErrors.currentPassword?.message}
                        />
                        <TextField
                            label="New password"
                            type="password"
                            fullWidth
                            autoComplete="new-password"
                            required
                            {...registerPassword('newPassword', {
                                required: 'New password is required',
                                minLength: {
                                    value: 6,
                                    message: 'Password should be at least 6 characters'
                                }
                            })}
                            error={Boolean(passwordErrors.newPassword)}
                            helperText={passwordErrors.newPassword?.message}
                        />
                        <TextField
                            label="Confirm new password"
                            type="password"
                            fullWidth
                            autoComplete="new-password"
                            required
                            sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }}
                            {...registerPassword('confirmPassword', {
                                required: 'Confirm your new password'
                            })}
                            error={Boolean(passwordErrors.confirmPassword)}
                            helperText={passwordErrors.confirmPassword?.message}
                        />
                    </Box>

                    <Divider />

                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button
                            type="button"
                            onClick={() => {
                                resetPasswordForm(emptyPasswordValues);
                            }}
                            disabled={isPasswordUpdating}
                        >
                            Clear
                        </Button>
                        <Button type="submit" variant="contained" disabled={isPasswordUpdating}>
                            {isPasswordUpdating ? 'Updating…' : 'Update password'}
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </Stack>
    );
};
