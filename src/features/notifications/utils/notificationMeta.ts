import type { ChipProps } from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentIndOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAltOutlined';
import ModeCommentIcon from '@mui/icons-material/ModeCommentOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import MarkChatUnreadIcon from '@mui/icons-material/MarkChatUnreadOutlined';
import ReplyIcon from '@mui/icons-material/ReplyOutlined';
import VideoCallIcon from '@mui/icons-material/VideoCallOutlined';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalkOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { NotificationType } from '../types/notification';

interface NotificationMeta {
    readonly label: string;
    readonly icon: SvgIconComponent;
    readonly paletteKey: Exclude<ChipProps['color'], 'default' | undefined>;
}

const metaMap: Record<NotificationType, NotificationMeta> = {
    task_assigned: {
        label: 'Task assigned',
        icon: AssignmentIndIcon,
        paletteKey: 'info'
    },
    task_completed: {
        label: 'Task completed',
        icon: TaskAltIcon,
        paletteKey: 'success'
    },
    comment_added: {
        label: 'Comment added',
        icon: ModeCommentIcon,
        paletteKey: 'secondary'
    },
    project_status_changed: {
        label: 'Project updated',
        icon: TrendingUpIcon,
        paletteKey: 'warning'
    },
    message_received: {
        label: 'Message received',
        icon: MarkChatUnreadIcon,
        paletteKey: 'primary'
    },
    message_reply: {
        label: 'Message reply',
        icon: ReplyIcon,
        paletteKey: 'primary'
    },
    call_scheduled: {
        label: 'Call scheduled',
        icon: VideoCallIcon,
        paletteKey: 'info'
    },
    incoming_call: {
        label: 'Incoming call',
        icon: PhoneInTalkIcon,
        paletteKey: 'success'
    }
};

export const getNotificationMeta = (type: NotificationType): NotificationMeta => metaMap[type];

export const getNotificationTypeOptions = (): {
    readonly value: NotificationType;
    readonly label: string;
}[] =>
    (Object.entries(metaMap) as [NotificationType, NotificationMeta][]).map(([value, meta]) => ({
        value,
        label: meta.label
    }));

export const formatNotificationType = (type: NotificationType): string => metaMap[type].label;
