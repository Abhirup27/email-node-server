export interface Email {
    id: string;
    senderEmail: string;
    senderName: string;
    recipientEmail: string;
    subject: string;
    body: string;
    status: 'sent' | 'failed' | 'queued' | 'processing';
}

export interface User {
    id: string;
    email: string;
    name: string;
}