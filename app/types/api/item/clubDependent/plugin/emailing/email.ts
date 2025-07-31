import type { ClubLinkedItem } from "~/types/api/clubLinkedItem";
import type { UuidItem } from "~/types/api/uuidItem";
import type { File } from "~/types/api/item/file";
import type { TimestampItem } from "~/types/api/timestampItem";

export enum EmailStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    FAILED = 'FAILED'
}

export interface Email extends UuidItem, ClubLinkedItem, TimestampItem {
    status?: EmailStatus;
    explanation?: string;
    isNewsletter?: boolean;
    title?: string;
    content?: string;
    recipientCount?: number;
    sender?: string;

    replyTo?: string;
    attachment?: File
    members?: string[];
}