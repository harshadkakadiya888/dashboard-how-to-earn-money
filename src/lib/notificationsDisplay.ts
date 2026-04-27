import { format, formatDistanceToNow, isToday, isYesterday, startOfDay } from 'date-fns';

export const NOTIFICATIONS_UPDATED_EVENT = 'app:notifications-updated';

export function emitNotificationsUpdated(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

export type NotificationType = 'like' | 'comment' | 'view' | 'system';

export interface NotificationPayload {
  type?: string;
  user?: string;
  /** Display or email of the most recent actor (from API). */
  latest_user?: string;
  /** Total likes or comments on the post when the notification was updated. */
  count?: number;
  post_title?: string;
  post_id?: number;
  post_slug?: string;
  comment_preview?: string;
  /** How many *additional* people beyond the named user (e.g. 2 → "Name and 2 others …"). */
  others_count?: number;
  views_count?: number;
  title?: string;
  body?: string;
  message?: string;
}

export interface NotificationItem {
  id: number;
  type: NotificationType;
  data: NotificationPayload;
  message: string;
  post: number | null;
  is_read: boolean;
  created_at: string;
}

const ICON: Record<NotificationType, string> = {
  like: '❤️',
  comment: '💬',
  view: '👁️',
  system: '🔔',
};

export function notificationIcon(t: string | undefined): string {
  if (t === 'like' || t === 'comment' || t === 'view' || t === 'system') {
    return ICON[t];
  }
  return '📌';
}

function displayNameFromPayload(d: NotificationPayload): string {
  if (typeof d.user === 'string' && d.user.trim()) return d.user.trim();
  const lu = d.latest_user;
  if (typeof lu === 'string' && lu.trim()) {
    const s = lu.trim();
    if (s.includes('@')) {
      const p = s.split('@')[0] || '';
      if (!p) return s;
      return p[0]!.toUpperCase() + p.slice(1);
    }
    return s;
  }
  return 'Someone';
}

export function getLikeCommentAggregate(
  item: NotificationItem
): { name: string; othersCount: number; kind: 'like' | 'comment' } | null {
  const t = (item.type || item.data?.type) as string;
  if (t !== 'like' && t !== 'comment') return null;
  const d = item.data || {};
  const name = displayNameFromPayload(d);
  let othersCount: number;
  if (d.others_count != null && d.others_count !== '') {
    othersCount = Math.max(0, Math.floor(Number(d.others_count)));
  } else if (d.count != null && d.count !== '') {
    const c = Math.max(0, Math.floor(Number(d.count)));
    othersCount = Math.max(0, c - 1);
  } else {
    othersCount = 0;
  }
  return { name, othersCount, kind: t as 'like' | 'comment' };
}

export function notificationTitleLine(item: NotificationItem): string {
  const d = item.data || {};
  const t = (item.type || d.type) as string;
  const user = d.user || 'Someone';
  if (t === 'like' || t === 'comment') {
    const o = Math.max(0, Math.floor(Number(d.others_count) || 0));
    if (o === 0) {
      return t === 'like' ? `${user} liked your post` : `${user} commented on your post`;
    }
    if (o === 1) {
      return t === 'like'
        ? `${user} and 1 other liked your post`
        : `${user} and 1 other commented on your post`;
    }
    return t === 'like'
      ? `${user} and ${o} others liked your post`
      : `${user} and ${o} others commented on your post`;
  }
  if (t === 'view') {
    const n = d.views_count != null ? `${d.views_count} views` : 'New view';
    return `Activity on your post — ${n}`;
  }
  if (t === 'system') {
    return (d.title as string) || d.body || d.message || 'System notification';
  }
  if (item.message) return item.message;
  return 'Notification';
}

export function notificationSubline(item: NotificationItem): string {
  const d = item.data || {};
  if (d.post_title) {
    if (item.type === 'comment' && d.comment_preview) {
      return `“${d.comment_preview}” — ${d.post_title}`;
    }
    return d.post_title;
  }
  return (item.message || '').trim();
}

export function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function timeTooltip(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return format(d, 'PPpp');
}

export interface DayGroup {
  key: string;
  label: string;
  items: NotificationItem[];
}

export function groupNotificationsByDay(items: NotificationItem[]): DayGroup[] {
  const map = new Map<string, { label: string; order: number; items: NotificationItem[] }>();
  for (const it of items) {
    const d = new Date(it.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const day = startOfDay(d);
    const key = String(day.getTime());
    let label = format(day, 'MMMM d, yyyy');
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    if (!map.has(key)) {
      map.set(key, { label, order: day.getTime(), items: [] });
    }
    map.get(key)!.items.push(it);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].order - a[1].order)
    .map(([k, g]) => ({ key: k, label: g.label, items: g.items }));
}

export function postEditPath(item: NotificationItem): string | null {
  const id = item.data?.post_id ?? item.post;
  if (id == null || !Number.isFinite(id)) return null;
  return `/create-post/${id}`;
}
