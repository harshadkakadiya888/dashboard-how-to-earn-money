import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MessageSquare, Calendar, ArrowLeft, ThumbsUp } from 'lucide-react';
import TableOfContents from '@/components/TableOfContents';
import { apiFetch, apiFetchJson } from '@/lib/apiFetch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface PostDetail {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  author: string;
  read_time: string;
  created_at: string | null;
}

interface BlogComment {
  id: number;
  _id: string;
  post: number;
  name: string;
  email?: string;
  comment: string;
  created_at: string;
}

interface PostLiker {
  client_id: string;
  username: string;
  email?: string;
  liked_at: string | null;
}

const BlogDetails = () => {
  const { blogId } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [likers, setLikers] = useState<PostLiker[]>([]);
  const [liking, setLiking] = useState(false);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const clientIdRef = useRef<string>('');
  const actorRef = useRef<{ username: string; email: string }>({ username: '', email: '' });

  useEffect(() => {
    let cid = localStorage.getItem('blog_client_id');
    if (!cid) {
      cid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('blog_client_id', cid);
    }
    clientIdRef.current = cid;
    try {
      const raw = localStorage.getItem('auth:user');
      const parsed = raw ? JSON.parse(raw) as { username?: string; email?: string } : {};
      actorRef.current = {
        username: parsed?.username || '',
        email: parsed?.email || '',
      };
    } catch {
      actorRef.current = { username: '', email: '' };
    }
  }, []);

  useEffect(() => {
    const fetchBlog = async () => {
      setLoading(true);
      try {
        const data = await apiFetchJson<PostDetail>(`/api/posts/${blogId}/`);
        setBlog(data);
      } catch {
        toast.error('Failed to load blog');
        setBlog(null);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [blogId]);

  useEffect(() => {
    const fetchLikeStatus = async () => {
      if (!blogId || !clientIdRef.current) return;
      try {
        const data = await apiFetchJson<{ liked: boolean; likes_count: number; likers?: PostLiker[] }>(
          `/api/posts/${blogId}/like-status/?client_id=${encodeURIComponent(clientIdRef.current)}`
        );
        setLikedByMe(Boolean(data.liked));
        setLikesCount(typeof data.likes_count === 'number' ? data.likes_count : 0);
        setLikers(Array.isArray(data.likers) ? data.likers : []);
      } catch {
        setLikedByMe(false);
        setLikesCount(0);
        setLikers([]);
      }
    };
    fetchLikeStatus();
  }, [blogId]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!blogId) return;
      try {
        const data = await apiFetchJson<{ comments: BlogComment[] }>(`/api/posts/${blogId}/comments/`);
        setComments(Array.isArray(data.comments) ? data.comments : []);
      } catch {
        setComments([]);
      }
    };
    fetchComments();
  }, [blogId]);

  const refreshComments = async () => {
    if (!blogId) return;
    const data = await apiFetchJson<{ comments: BlogComment[] }>(`/api/posts/${blogId}/comments/`);
    setComments(Array.isArray(data.comments) ? data.comments : []);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogId) return;
    if (!commentName.trim() || !commentText.trim()) {
      toast.error('Name and comment are required');
      return;
    }
    setSubmittingComment(true);
    try {
      const payload = new FormData();
      payload.append('name', commentName.trim());
      payload.append('email', commentEmail.trim());
      payload.append('comment', commentText.trim());
      const res = await apiFetch(`/api/posts/${blogId}/comments/`, {
        method: 'POST',
        body: payload,
      });
      if (!res.ok) {
        const text = await res.text();
        toast.error(text || 'Failed to add comment');
        return;
      }
      setCommentName('');
      setCommentEmail('');
      setCommentText('');
      await refreshComments();
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Delete this comment?')) return;
    setDeletingCommentId(commentId);
    try {
      const res = await apiFetch(`/api/comments/${commentId}/`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const text = await res.text();
        toast.error(text || 'Failed to delete comment');
        return;
      }
      await refreshComments();
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleToggleLike = async () => {
    if (!blogId || !clientIdRef.current) return;
    setLiking(true);
    try {
      const payload = new FormData();
      payload.append('client_id', clientIdRef.current);
      if (actorRef.current.username) payload.append('username', actorRef.current.username);
      if (actorRef.current.email) payload.append('email', actorRef.current.email);
      const res = await apiFetch(`/api/posts/${blogId}/like/`, {
        method: 'POST',
        body: payload,
      });
      if (!res.ok) {
        toast.error('Failed to update like');
        return;
      }
      const data = (await res.json()) as { liked: boolean; likes_count: number; likers?: PostLiker[] };
      setLikedByMe(Boolean(data.liked));
      setLikesCount(typeof data.likes_count === 'number' ? data.likes_count : 0);
      setLikers(Array.isArray(data.likers) ? data.likers : []);
    } catch {
      toast.error('Failed to update like');
    } finally {
      setLiking(false);
    }
  };

  if (loading) return <div>Loading blog...</div>;
  if (!blog) return <div>Blog not found.</div>;

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{blog.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 text-gray-500 flex flex-wrap gap-3 items-center text-sm">
            {blog.created_at && (
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(blog.created_at).toLocaleDateString()}
              </span>
            )}
            {blog.author && <span>By {blog.author}</span>}
            {blog.read_time && <span>{blog.read_time}</span>}
            <Button
              type="button"
              variant={likedByMe ? 'default' : 'outline'}
              size="sm"
              className="ml-auto"
              onClick={handleToggleLike}
              disabled={liking}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              {likedByMe ? 'Unlike' : 'Like'} ({likesCount})
            </Button>
          </div>
          {blog.excerpt && <p className="text-gray-600 mb-4 italic">{blog.excerpt}</p>}
          {blog.featured_image && (
            <img
              src={blog.featured_image}
              alt={blog.title}
              className="w-full max-h-96 object-cover rounded mb-4"
            />
          )}
          <div className="grid md:grid-cols-4 gap-6 items-start">
            <aside className="md:col-span-1 sticky top-4">
              <TableOfContents containerRef={contentRef} />
              <Card className="mt-4">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Who liked ({likesCount})</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  {likers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No likes yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {likers.slice(0, 8).map((liker, index) => (
                        <div key={`${liker.client_id}-${index}`} className="text-xs">
                          <p className="font-medium truncate">{liker.username || liker.client_id}</p>
                          {liker.email && (
                            <p className="text-muted-foreground truncate">{liker.email}</p>
                          )}
                          {liker.liked_at && (
                            <p className="text-muted-foreground">
                              {new Date(liker.liked_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </aside>
            <article className="md:col-span-3">
              <div
                ref={contentRef}
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: blog.content }}
              />
            </article>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Comments ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddComment} className="space-y-3 border rounded-lg p-4 mb-6">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="comment-name">Name *</Label>
                <Input
                  id="comment-name"
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="comment-email">Email</Label>
                <Input
                  id="comment-email"
                  type="email"
                  value={commentEmail}
                  onChange={(e) => setCommentEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="comment-text">Comment *</Label>
              <Textarea
                id="comment-text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={4}
                placeholder="Write your comment..."
                required
              />
            </div>
            <Button type="submit" disabled={submittingComment}>
              {submittingComment ? 'Posting...' : 'Add Comment'}
            </Button>
          </form>

          {comments.length === 0 ? (
            <div className="text-gray-500">No comments yet.</div>
          ) : (
            <div className="space-y-4">
              {comments.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteComment(item.id)}
                      disabled={deletingCommentId === item.id}
                    >
                      Delete
                    </Button>
                  </div>
                  {item.email && <p className="text-xs text-muted-foreground mt-1">{item.email}</p>}
                  <p className="mt-3 whitespace-pre-wrap">{item.comment}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BlogDetails;
