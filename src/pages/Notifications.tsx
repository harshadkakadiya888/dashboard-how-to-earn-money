import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch, apiFetchJson } from '@/lib/apiFetch';
import { toast } from 'sonner';

interface NotificationItem {
  id: number;
  kind: 'like' | 'comment';
  message: string;
  post: number | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetchJson<{ notifications: NotificationItem[] }>('/api/notifications/');
      setItems(Array.isArray(res.notifications) ? res.notifications : []);
    } catch {
      toast.error('Failed to load notifications');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      const res = await apiFetch(`/api/notifications/${id}/read/`, { method: 'POST' });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllRead = async () => {
    try {
      const res = await apiFetch('/api/notifications/read-all/', { method: 'POST' });
      if (!res.ok) throw new Error();
      await load();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all notifications');
    }
  };

  if (loading) return <div>Loading notifications...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Latest likes and comments on your posts</CardDescription>
          </div>
          <Button variant="outline" onClick={markAllRead}>Mark all read</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-3 ${item.is_read ? 'bg-background' : 'bg-muted/40'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">{item.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!item.is_read && (
                    <Button size="sm" variant="secondary" onClick={() => markAsRead(item.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
