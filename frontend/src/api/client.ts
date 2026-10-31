import type {
  Counts, Email, Meta, Page, ScheduleResult, SchedulePayload, SlackStatus, User,
} from '../types';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data as T;
}

export const api = {
  me: () => request<User>('/auth/me'),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  meta: () => request<Meta>('/emails/meta'),
  counts: () => request<Counts>('/emails/counts'),
  listEmails: (status: 'scheduled' | 'sent', q: string, limit: number, offset = 0) =>
    request<Page<Email>>(`/emails?${new URLSearchParams({ status, q, limit: String(limit), offset: String(offset) })}`),
  getEmail: (id: string) => request<Email>(`/emails/${id}`),
  schedule: (p: SchedulePayload) =>
    request<ScheduleResult>('/emails/schedule', { method: 'POST', body: JSON.stringify(p) }),
  slackStatus: () => request<SlackStatus>('/slack/status'),
  slackConnectUrl: () => request<{ url: string }>('/slack/connect-url'),
  slackTest: () => request<{ ok: boolean }>('/slack/test', { method: 'POST' }),
  slackDisconnect: () => request<{ ok: boolean }>('/slack', { method: 'DELETE' }),
};
