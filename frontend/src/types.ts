export type EmailStatus = 'scheduled' | 'sending' | 'sent' | 'failed';

export interface User { id: string; email: string; name: string; avatar: string | null }

export interface Email {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  previewUrl: string | null;
  error: string | null;
  fromEmail: string;
}

export interface Page<T> { items: T[]; total: number }
export interface Sender { id: string; email: string }
export interface Meta { senders: Sender[]; limits: { maxEmailsPerHour: number; minDelayMs: number } }
export interface Counts { scheduled: number; sent: number }
export interface SlackStatus { connected: boolean; channel?: string; teamName?: string }

export interface SchedulePayload {
  subject: string;
  body: string;
  recipients: string[];
  startTime?: string;
  delaySeconds: number;
  hourlyLimit?: number;
  senderId: string | null;
}
export interface ScheduleResult { batchId: string; count: number; firstSendAt: string; lastSendAt: string }
