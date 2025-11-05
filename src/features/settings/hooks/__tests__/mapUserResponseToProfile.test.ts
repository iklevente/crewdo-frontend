import {
    type UserResponseDto,
    UserResponseDtoRoleEnum,
    UserResponseDtoStatusEnum
} from 'api/models/user-response-dto';
import { mapUserResponseToProfile } from '../useCurrentUserProfile';

describe('mapUserResponseToProfile', () => {
    const basePayload: UserResponseDto = {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Pat',
        lastName: 'Doe',
        role: UserResponseDtoRoleEnum.TeamMember,
        status: UserResponseDtoStatusEnum.Active,
        isEmailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z'
    };

    it('maps optional fields to null when missing', () => {
        const result = mapUserResponseToProfile(basePayload);

        expect(result).toMatchObject({
            phoneNumber: null,
            department: null,
            position: null,
            profilePicture: null,
            lastLoginAt: null,
            isEmailVerified: false
        });
    });

    it('preserves optional fields and normalizes booleans when provided', () => {
        const payload: UserResponseDto = {
            ...basePayload,
            phoneNumber: '+1234567890',
            department: 'Engineering',
            position: 'Developer',
            profilePicture: 'https://example.com/avatar.png',
            isEmailVerified: true,
            lastLoginAt: '2024-02-01T00:00:00.000Z'
        };

        const result = mapUserResponseToProfile(payload);

        expect(result).toMatchObject({
            phoneNumber: '+1234567890',
            department: 'Engineering',
            position: 'Developer',
            profilePicture: 'https://example.com/avatar.png',
            lastLoginAt: '2024-02-01T00:00:00.000Z',
            isEmailVerified: true
        });
    });
});
