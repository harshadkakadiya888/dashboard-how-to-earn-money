import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch, apiFetchJson } from '@/lib/apiFetch';
import { toast } from 'sonner';
import {
  emitNotificationsUpdated,
  groupNotificationsByDay,
  getLikeCommentAggregate,
  notificationIcon,
  notificationSubline,
  notificationTitleLine,
  postEditPath,
  timeAgo,
  timeTooltip,
  type DayGroup,
  type NotificationItem,
} from '@/lib/notificationsDisplay';
import { ExternalLink, Loader2, MessageCircle, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationDetailDialog } from '@/components/NotificationDetailDialog';

type NotificationListResponse = {
  notifications: NotificationItem[];
  unread_count?: number;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [allBusy, setAllBusy] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContext, setDetailContext] = useState<{ postId: number; kind: 'like' | 'comment' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetchJson<NotificationListResponse>('/api/notifications/');
      setItems(Array.isArray(res.notifications) ? res.notifications : []);
    } catch {
      toast.error('Failed to load notifications');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAsRead = async (id: number) => {
    setActionId(id);
    try {
      const res = await apiFetch('/api/notifications/mark-read/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      await res.json().catch(() => ({}));
      emitNotificationsUpdated();
      await load();
    } catch {
      toast.error('Failed to mark notification as read');
    } finally {
      setActionId(null);
    }
  };

  const markAllRead = async () => {
    setAllBusy(true);
    try {
      const res = await apiFetch('/api/notifications/mark-read/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      });
      if (!res.ok) throw new Error();
      await res.json().catch(() => ({}));
      emitNotificationsUpdated();
      await load();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all notifications');
    } finally {
      setAllBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[240px] text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading notifications…</span>
      </div>
    );
  }

  const groups: DayGroup[] = groupNotificationsByDay(items);
  const unreadN = items.filter((i) => !i.is_read).length;

  const openNotificationDetail = (item: NotificationItem) => {
    const t = (item.data?.type || item.type) as string;
    if (t !== 'like' && t !== 'comment') return;
    const pid = item.data?.post_id ?? item.post;
    if (pid == null || !Number.isFinite(Number(pid))) return;
    setDetailContext({ postId: Number(pid), kind: t as 'like' | 'comment' });
    setDetailOpen(true);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <NotificationDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        postId={detailContext?.postId ?? 0}
        kind={detailContext?.kind ?? null}
      />
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b bg-muted/30">
          <div className="space-y-1">
            <CardTitle className="text-xl">Notifications</CardTitle>
            <CardDescription>
              {unreadN > 0
                ? `${unreadN} unread — likes, comments, and views on your posts`
                : "You're all caught up"}
            </CardDescription>
          </div>
          <Button variant="secondary" onClick={markAllRead} disabled={unreadN === 0 || allBusy}>
            {allBusy ? 'Working…' : 'Mark all read'}
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet. When readers engage, they show up here.</p>
          ) : (
            <div className="space-y-8">
              {groups.map((g) => (
                <div key={g.key}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {g.label}
                  </h2>
                  <ul className="space-y-2">
                    {g.items.map((item) => (
                      <li key={item.id}>
                        <NotificationRow
                          item={item}
                          busy={actionId === item.id}
                          onRead={() => void markAsRead(item.id)}
                          onOpenDetail={openNotificationDetail}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationRow({
  item,
  busy,
  onRead,
  onOpenDetail,
}: {
  item: NotificationItem;
  busy: boolean;
  onRead: () => void;
  onOpenDetail?: (item: NotificationItem) => void;
}) {
  const t = (item.data?.type || item.type) as string | undefined;
  const likeComment = getLikeCommentAggregate(item);
  const sub = notificationSubline(item);
  const edit = postEditPath(item);

  if (likeComment) {
    return (
      <div
        className={cn(
          'group relative flex w-full flex-col gap-3 rounded-xl border p-3 transition-all sm:flex-row sm:items-center',
          'border-zinc-800/90 bg-zinc-900/95 text-zinc-100',
          'hover:border-zinc-700 hover:bg-zinc-900',
          onOpenDetail && 'cursor-pointer',
          !item.is_read
            ? 'ring-1 ring-sky-500/35'
            : 'ring-0',
        )}
        role={onOpenDetail ? 'button' : undefined}
        tabIndex={onOpenDetail ? 0 : undefined}
        onKeyDown={
          onOpenDetail
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenDetail(item);
                }
              }
            : undefined
        }
        onClick={() => onOpenDetail?.(item)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {likeComment.kind === 'like' ? (
            <ThumbsUp className="h-5 w-5 shrink-0 text-blue-500" strokeWidth={2} aria-hidden />
          ) : (
            <MessageCircle className="h-5 w-5 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
          )}
          <div className="min-w-0">
            <AggregatedLine aggregate={likeComment} />
            {sub ? (
              <p
                className="mt-1 line-clamp-2 text-sm text-zinc-400"
                title={sub}
              >
                {sub}
              </p>
            ) : null}
            <p
              className="mt-1.5 text-xs text-zinc-500"
              title={timeTooltip(item.created_at)}
            >
              {timeAgo(item.created_at)}
            </p>
          </div>
        </div>
        <div
          className="flex shrink-0 flex-row items-center justify-end gap-1.5 pl-0 sm:pl-2"
          onClick={(e) => e.stopPropagation()}
        >
          {edit && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              <Link to={edit}>
                <span className="inline-flex items-center gap-1">
                  Post
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </span>
              </Link>
            </Button>
          )}
          {!item.is_read && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRead}
              disabled={busy}
              className="h-8 border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark read'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const icon = notificationIcon(t);
  return (
    <div
      className={cn(
        'group relative flex gap-3 rounded-xl border p-3 transition-all',
        'hover:border-border hover:bg-muted/40 hover:shadow-sm',
        !item.is_read
          ? 'border-primary/35 bg-primary/[0.06] ring-1 ring-primary/15'
          : 'border-border/60 bg-card',
      )}
    >
      <div
        className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-lg bg-muted text-lg"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground">{notificationTitleLine(item)}</p>
        {sub ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground" title={sub}>
            {sub}
          </p>
        ) : null}
        <p className="mt-1.5 text-xs text-muted-foreground" title={timeTooltip(item.created_at)}>
          {timeAgo(item.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
        {edit && (
          <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-muted-foreground">
            <Link to={edit}>
              <span className="inline-flex items-center gap-1">
                Post
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </span>
            </Link>
          </Button>
        )}
        {!item.is_read && (
          <Button size="sm" variant="secondary" onClick={onRead} disabled={busy} className="h-8">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark read'}
          </Button>
        )}
      </div>
    </div>
  );
}

function AggregatedLine({
  aggregate: { name, othersCount, kind },
}: {
  aggregate: { name: string; othersCount: number; kind: 'like' | 'comment' };
}) {
  if (kind === 'like') {
    if (othersCount <= 0) {
      return (
        <p className="text-sm leading-snug text-zinc-200">
          <span className="font-bold text-white">{name}</span> liked your post
        </p>
      );
    }
    if (othersCount === 1) {
      return (
        <p className="text-sm leading-snug text-zinc-200">
          <span className="font-bold text-white">{name}</span> and 1 other liked your post
        </p>
      );
    }
    return (
      <p className="text-sm leading-snug text-zinc-200">
        <span className="font-bold text-white">{name}</span> and {othersCount} others liked your post
      </p>
    );
  }
  if (othersCount <= 0) {
    return (
      <p className="text-sm leading-snug text-zinc-200">
        <span className="font-bold text-white">{name}</span> commented on your post
      </p>
    );
  }
  if (othersCount === 1) {
    return (
      <p className="text-sm leading-snug text-zinc-200">
        <span className="font-bold text-white">{name}</span> and 1 other commented on your post
      </p>
    );
  }
  return (
    <p className="text-sm leading-snug text-zinc-200">
      <span className="font-bold text-white">{name}</span> and {othersCount} others commented on your post
    </p>
  );
}
