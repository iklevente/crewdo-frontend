import type {
    TaskResponseDto,
    TaskResponseDtoPriorityEnum,
    TaskResponseDtoStatusEnum
} from 'api/models/task-response-dto';

export type TaskStatus = TaskResponseDtoStatusEnum;
export type TaskPriority = TaskResponseDtoPriorityEnum;

export interface TaskAssignee {
    readonly id: string;
    readonly firstName?: string;
    readonly lastName?: string;
    readonly email?: string;
}

export interface ProjectTask {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly status: TaskStatus;
    readonly priority: TaskPriority;
    readonly dueDate?: string | null;
    readonly estimatedHours?: number | null;
    readonly actualHours?: number | null;
    readonly tags: string[];
    readonly position: number;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly projectId: string;
    readonly projectName?: string;
    readonly assignee?: TaskAssignee | null;
    readonly creator: TaskAssignee;
    readonly commentCount?: number;
}

const mapPerson = (payload: unknown): TaskAssignee | null => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    const source = payload as Record<string, unknown>;
    const id = typeof source.id === 'string' ? source.id : '';
    const firstName = typeof source.firstName === 'string' ? source.firstName : undefined;
    const lastName = typeof source.lastName === 'string' ? source.lastName : undefined;
    const email = typeof source.email === 'string' ? source.email : undefined;
    return { id, firstName, lastName, email };
};

export const mapTaskResponse = (payload: TaskResponseDto): ProjectTask => {
    const project = payload.project as Record<string, unknown> | undefined;
    const fallbackProjectSource = payload as unknown as Record<string, unknown>;
    const fallbackProjectId =
        fallbackProjectSource && typeof fallbackProjectSource.projectId === 'string'
            ? fallbackProjectSource.projectId
            : '';
    const assignee = mapPerson(payload.assignee);
    const creator = mapPerson(payload.creator) ?? { id: '', email: undefined };

    return {
        id: payload.id,
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        dueDate: payload.dueDate ?? null,
        estimatedHours: typeof payload.estimatedHours === 'number' ? payload.estimatedHours : null,
        actualHours: typeof payload.actualHours === 'number' ? payload.actualHours : null,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        position: typeof payload.position === 'number' ? payload.position : 0,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        projectId: project && typeof project.id === 'string' ? project.id : fallbackProjectId,
        projectName: project && typeof project.name === 'string' ? project.name : undefined,
        assignee,
        creator,
        commentCount: payload.commentCount
    };
};

export const TASK_STATUS_METADATA: Record<
    TaskStatus,
    { readonly label: string; readonly description: string }
> = {
    todo: {
        label: 'To Do',
        description: 'Tasks that are ready to be picked up.'
    },
    in_progress: {
        label: 'In Progress',
        description: 'Work underway by the assignee.'
    },
    in_review: {
        label: 'In Review',
        description: 'Awaiting review or QA checks.'
    },
    done: {
        label: 'Done',
        description: 'Completed tasks that passed review.'
    },
    cancelled: {
        label: 'Cancelled',
        description: 'Tasks that are no longer needed.'
    }
};

export const TASK_PRIORITY_METADATA: Record<
    TaskPriority,
    { readonly label: string; readonly color: string }
> = {
    low: { label: 'Low', color: '#81C784' },
    medium: { label: 'Medium', color: '#64B5F6' },
    high: { label: 'High', color: '#FFB74D' },
    urgent: { label: 'Urgent', color: '#E57373' }
};
