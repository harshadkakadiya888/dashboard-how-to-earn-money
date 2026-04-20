import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Eye, Calendar, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { stripHtml } from '@/lib/html';
import { apiFetchJson, apiFetchVoid } from '@/lib/apiFetch';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';

export interface PostRow {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  created_at?: string | null;
}

const PostsPage = () => {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchJson<{ posts: PostRow[] }>('/api/posts/');
      const list = Array.isArray(res.posts) ? res.posts : [];
      setPosts(list);
    } catch (e) {
      console.error('Failed to fetch posts:', e);
      setError('Could not load posts. Is the API running?');
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const searchParam = urlParams.get('search');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (page > 0) setCurrentPage(page);
    }
    if (searchParam) {
      setSearchTerm(searchParam);
      setDebouncedSearchTerm(searchParam);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (currentPage > 1) {
      url.searchParams.set('page', currentPage.toString());
    } else {
      url.searchParams.delete('page');
    }
    if (debouncedSearchTerm) {
      url.searchParams.set('search', debouncedSearchTerm);
    } else {
      url.searchParams.delete('search');
    }
    window.history.replaceState({}, '', url.toString());
  }, [currentPage, debouncedSearchTerm]);

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const q = debouncedSearchTerm.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      const title = p.title?.toLowerCase() ?? '';
      const ex = (p.excerpt || '').toLowerCase();
      const plain = stripHtml(p.content || '').toLowerCase();
      return title.includes(q) || ex.includes(q) || plain.includes(q);
    });
  }, [posts, debouncedSearchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages, debouncedSearchTerm]);

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPosts.slice(start, start + pageSize);
  }, [filteredPosts, currentPage, pageSize]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setDeletingId(id);
    try {
      await apiFetchVoid(`/api/posts/${id}/`, { method: 'DELETE' });
      toast.success('Post deleted');
      await loadPosts();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete post');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const searchInput = searchInputRef.current;
    if (!searchInput) return;
    const storeCursorPosition = () => {
      const start = searchInput.selectionStart;
      const end = searchInput.selectionEnd;
      searchInput.dataset.cursorStart = String(start);
      searchInput.dataset.cursorEnd = String(end);
    };
    const restoreCursorPosition = () => {
      const start = parseInt(searchInput.dataset.cursorStart || '0', 10);
      const end = parseInt(searchInput.dataset.cursorEnd || '0', 10);
      if (start >= 0 && end >= 0) searchInput.setSelectionRange(start, end);
    };
    searchInput.addEventListener('beforeinput', storeCursorPosition);
    searchInput.addEventListener('input', restoreCursorPosition);
    return () => {
      searchInput.removeEventListener('beforeinput', storeCursorPosition);
      searchInput.removeEventListener('input', restoreCursorPosition);
    };
  }, []);

  if (loading) {
    return <div>Loading posts...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {paginatedPosts.map((post) => {
          const excerptText =
            (post.excerpt && post.excerpt.trim()) ||
            stripHtml(post.content).slice(0, 200) ||
            '(No excerpt)';
          return (
            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {post.featured_image && (
                <div className="h-48 overflow-hidden">
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg text-slate-800 line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-3">{excerptText}</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {post.created_at
                    ? new Date(post.created_at).toLocaleDateString()
                    : `Post #${post.id}`}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/posts/${post.id}`)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/create-post/${post.id}`)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                aria-disabled={currentPage === 1}
                tabIndex={currentPage === 1 ? -1 : 0}
                style={{
                  pointerEvents: currentPage === 1 ? 'none' : 'auto',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              />
            </PaginationItem>
            {(() => {
              const pages: JSX.Element[] = [];
              const pageNumbers: number[] = [];
              for (let i = 1; i <= totalPages; i++) {
                if (
                  i === 1 ||
                  i === totalPages ||
                  (i >= currentPage - 2 && i <= currentPage + 2)
                ) {
                  pageNumbers.push(i);
                }
              }
              let lastPage = 0;
              pageNumbers.forEach((page) => {
                if (page - lastPage > 1) {
                  pages.push(
                    <PaginationItem key={`ellipsis-${page}`}>
                      <span className="px-2">...</span>
                    </PaginationItem>
                  );
                }
                pages.push(
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => setCurrentPage(page)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span>{page}</span>
                    </PaginationLink>
                  </PaginationItem>
                );
                lastPage = page;
              });
              return pages;
            })()}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                aria-disabled={currentPage === totalPages}
                tabIndex={currentPage === totalPages ? -1 : 0}
                style={{
                  pointerEvents: currentPage === totalPages ? 'none' : 'auto',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No posts found</h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first blog post to get started'}
          </p>
        </div>
      )}
    </div>
  );
};

export default PostsPage;
