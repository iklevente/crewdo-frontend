import type {
    ProjectResponseDto,
    ProjectResponseDtoPriorityEnum,
    ProjectResponseDtoStatusEnum
} from 'api/models/project-response-dto';

export type ProjectStatus = ProjectResponseDtoStatusEnum;
export type ProjectPriority = ProjectResponseDtoPriorityEnum;

export interface ProjectMember {
    readonly id: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly email?: string;
}

export interface Project {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly status: ProjectStatus;
    readonly priority: ProjectPriority;
    readonly startDate?: string | null;
    readonly endDate?: string | null;
    readonly deadline?: string | null;
    readonly budget?: number | null;
    readonly color?: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly owner: ProjectMember;
    readonly members: ProjectMember[];
    readonly taskCount: number;
    readonly workspaceId: string | null;
    readonly workspaceName?: string | null;
}

const mapMember = (payload: unknown): ProjectMember => {
    if (!payload || typeof payload !== 'object') {
        return { id: '' };
    }
    const source = payload as Record<string, unknown>;
    const id = typeof source.id === 'string' ? source.id : '';
    const firstName = typeof source.firstName === 'string' ? source.firstName : undefined;
    const lastName = typeof source.lastName === 'string' ? source.lastName : undefined;
    const email = typeof source.email === 'string' ? source.email : undefined;
    return { id, firstName, lastName, email };
};

export const mapProjectResponse = (payload: ProjectResponseDto): Project => {
    const owner = mapMember(payload.owner);
    const members = Array.isArray(payload.members)
        ? (payload.members as unknown[]).map(mapMember)
        : [];
    const workspaceSource = payload as unknown as Record<string, unknown>;
    const workspace =
        typeof workspaceSource.workspace === 'object' ? workspaceSource.workspace : null;
    const workspaceId =
        typeof workspaceSource.workspaceId === 'string'
            ? workspaceSource.workspaceId
            : workspace && typeof (workspace as Record<string, unknown>).id === 'string'
              ? ((workspace as Record<string, unknown>).id as string)
              : null;
    const workspaceName =
        workspace && typeof (workspace as Record<string, unknown>).name === 'string'
            ? ((workspace as Record<string, unknown>).name as string)
            : null;

    return {
        id: payload.id,
        name: payload.name,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        startDate: payload.startDate ?? null,
        endDate: payload.endDate ?? null,
        deadline: payload.deadline ?? null,
        budget: typeof payload.budget === 'number' ? payload.budget : null,
        color: payload.color ?? null,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        owner,
        members,
        taskCount: typeof payload.taskCount === 'number' ? payload.taskCount : 0,
        workspaceId,
        workspaceName: workspaceName ?? undefined
    };
};

export const getProjectParticipants = (project: Project): ProjectMember[] => {
    const seen = new Set<string>();
    const participants: ProjectMember[] = [];

    const push = (member: ProjectMember | undefined): void => {
        if (!member?.id || seen.has(member.id)) {
            return;
        }
        seen.add(member.id);
        participants.push(member);
    };

    push(project.owner);
    project.members.forEach(push);

    return participants;
};

export const PROJECT_STATUS_METADATA: Record<
    ProjectStatus,
    { readonly label: string; readonly color: string }
> = {
    planning: { label: 'Planning', color: '#5B8DEF' },
    in_progress: { label: 'In Progress', color: '#FF9F1A' },
    on_hold: { label: 'On Hold', color: '#9C27B0' },
    completed: { label: 'Completed', color: '#2EB67D' },
    cancelled: { label: 'Cancelled', color: '#D32F2F' }
};

export const PROJECT_PRIORITY_METADATA: Record<
    ProjectPriority,
    { readonly label: string; readonly color: string }
> = {
    low: { label: 'Low', color: '#81C784' },
    medium: { label: 'Medium', color: '#64B5F6' },
    high: { label: 'High', color: '#FFB74D' },
    urgent: { label: 'Urgent', color: '#E57373' }
};
