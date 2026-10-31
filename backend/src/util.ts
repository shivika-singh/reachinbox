import { NextFunction, Request, Response } from 'express';

export const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export const HOUR_MS = 3_600_000;
export const hourWindow = (t = Date.now()) => Math.floor(t / HOUR_MS);

export const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export const toDto = (r: any) => ({
  id: r.id as string,
  toEmail: r.to_email as string,
  subject: r.subject as string,
  body: r.body as string,
  status: r.status as string,
  scheduledAt: r.scheduled_at,
  sentAt: r.sent_at,
  previewUrl: r.preview_url as string | null,
  error: r.error as string | null,
  fromEmail: r.sender_email as string,
});
