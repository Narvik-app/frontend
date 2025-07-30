import type { ClubLinkedItem } from "~/types/api/clubLinkedItem";
import type { UuidItem } from "~/types/api/uuidItem";
import type { File } from "~/types/api/item/file";

export enum EmailStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    FAILED = 'FAILED'
}

export interface Email extends UuidItem, ClubLinkedItem {
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