import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetchJson } from '@/lib/apiFetch';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type CommentRow = {
  id: number;
  name?: string;
  email?: string;
  comment?: string;
  created_at?: string;
};

type LikesResponse = {
  likes_count: number;
  recent: { name: string; email: string; client_id: string; liked_at: string | null }[];
  registered_users: { username: string; email: string; source: string }[];
};

type CommentsResponse = {
  comments: CommentRow[];
};

type NotificationDetailDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postId: number;
  kind: 'like' | 'comment' | null;
};

export function NotificationDetailDialog({ open, onOpenChange, postId, kind }: NotificationDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState<LikesResponse | null>(null);
  const [comments, setComments] = useState<CommentRow[] | null>(null);

  useEffect(() => {
    if (!open || postId < 1 || !kind) {
      return;
    }
    setLoading(true);
    setError(null);
    setLikes(null);
    setComments(null);
    const ac = new AbortController();
    (async () => {
      try {
        if (kind === 'like') {
          const r = await apiFetchJson<LikesResponse>(`/api/posts/${postId}/likes/?limit=10`, {
            signal: ac.signal,
          });
          setLikes(r);
        } else {
          const r = await apiFetchJson<CommentsResponse>(`/api/posts/${postId}/comments/?limit=10`, {
            signal: ac.signal,
          });
          setComments(Array.isArray(r.comments) ? r.comments : []);
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError('Could not load details.');
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [open, postId, kind]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{kind === 'like' ? 'Recent likes' : 'Recent comments'}</DialogTitle>
          <DialogDescription>Last 10 {kind === 'like' ? 'reactions' : 'comments'} on this post (newest first).</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-4">{error}</p>
        ) : kind === 'like' && likes ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">Total likes: {likes.likes_count}</p>
            {likes.recent.length > 0 ? (
              <ul className="space-y-2">
                {likes.recent.map((l, i) => (
                  <li
                    key={`${l.client_id}-${i}`}
                    className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2"
                  >
                    <div className="font-medium text-foreground">{l.name || l.email || l.client_id}</div>
                    {l.email ? <div className="text-xs text-muted-foreground">{l.email}</div> : null}
                    {l.liked_at ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(l.liked_at), 'PPp')}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No anonymous like records in the last 10 (see registered below).</p>
            )}
            {likes.registered_users.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Registered accounts (sample)</p>
                <ul className="space-y-1 text-xs">
                  {likes.registered_users.map((u) => (
                    <li key={u.username}>
                      {u.username}
                      {u.email ? ` · ${u.email}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : kind === 'comment' && comments != null ? (
          <ul className="space-y-2 text-sm">
            {comments.length === 0 ? (
              <p className="text-muted-foreground">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <li key={c.id} className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
                  <div className="font-medium text-foreground">{c.name || 'User'}</div>
                  {c.email ? <div className="text-xs text-muted-foreground">{c.email}</div> : null}
                  <p className="mt-1 whitespace-pre-wrap text-foreground/90">{c.comment}</p>
                  {c.created_at ? (
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(c.created_at), 'PPp')}
                    </div>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
