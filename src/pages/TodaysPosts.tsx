import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2, Eye, Calendar, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import BlogPostForm from "@/components/BlogPostForm.tsx";
import apiClient from '@/lib/api';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';

interface BlogPost {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: any;
  tags: string[];
  image: string;
  createdAt: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  articleSummary: string;
  faqs: { question: string; answer: string }[];
}

const TodaysPostsPage = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Changed to 10 per page
  const [totalPages, setTotalPages] = useState(1);

  // Get URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam) {
      const page = parseInt(pageParam);
      if (page > 0) {
        setCurrentPage(page);
      }
    }
  }, []);

  // Update URL when page changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (currentPage > 1) {
      url.searchParams.set('page', currentPage.toString());
    } else {
      url.searchParams.delete('page');
    }
    window.history.replaceState({}, '', url.toString());
  }, [currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      
      const [postsRes, categoriesRes] = await Promise.all([
        apiClient.get('/api/blogs', { params }),
        apiClient.get('/api/categories')
      ]);
      console.log('API postsRes:', postsRes);
      console.log('API postsRes?.data?.data?.blogs:', postsRes?.data?.data?.blogs);
      setPosts(Array.isArray(postsRes?.data?.data?.blogs) ? postsRes.data.data.blogs : []);
      setCategories(categoriesRes?.data?.data?.categories || []);
      setTotalPages(postsRes?.data?.data?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on new search
  }, [searchTerm]);

  // Filter posts to show only today's posts
  const getTodaysPosts = () => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return posts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= todayStart && postDate < todayEnd;
    });
  };

  // Add null checks and robust logic for posts/filteredPosts
  const safePosts = Array.isArray(posts) ? posts : [];
  const todaysPosts = getTodaysPosts();
  const safeTodaysPosts = Array.isArray(todaysPosts) ? todaysPosts : [];
  const filteredPosts = safeTodaysPosts.filter(post => {
    const search = searchTerm.toLowerCase();
    const titleMatch = post.title?.toLowerCase().includes(search);
    const authorMatch = post.author?.toLowerCase().includes(search);
    let categoryName = '';
    if (typeof post.category === 'object' && post.category !== null) {
      categoryName = post.category.name || '';
    }
    // If category is a string (ObjectId), skip name search
    const categoryMatch = categoryName.toLowerCase().includes(search);
    return titleMatch || authorMatch || categoryMatch;
  });
  const safeFilteredPosts = Array.isArray(filteredPosts) ? filteredPosts : [];
  const paginatedPosts = safeFilteredPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setTotalPages(Math.ceil(filteredPosts.length / pageSize) || 1);
  }, [filteredPosts, pageSize]);

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setIsDeleting(postId);
    try {
      await apiClient.delete(`/api/blogs/${postId}`);
      toast.success('Post deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
  };
  
  const handleSuccess = () => {
    setEditingPost(null);
    fetchData();
  }

  const closeDialog = () => {
    setEditingPost(null);
  };

  console.log('Posts state before render:', posts);

  if (loading) {
      return <div>Loading today's posts...</div>
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Today's Posts</h1>
              <Badge variant="secondary" className="ml-2">
                {todaysPosts.length} posts today
              </Badge>
            </div>
             <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                  placeholder="Search today's posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
              />
            </div>
        </div>

        {todaysPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Clock className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No posts uploaded today</h3>
            <p className="text-gray-500 mb-4">
              No blog posts have been created today ({new Date().toLocaleDateString()})
            </p>
            <Button onClick={() => window.location.href = '/create-post'}>
              Create Your First Post Today
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPosts.map((post) => (
                <Card key={post._id} className="overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                  {post.image && (
                      <div className="h-48 overflow-hidden">
                        <img
                            src={post.image}
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
                      {post.excerpt && (
                          <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                            {post.excerpt}
                          </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString()}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        {post.author && (
                            <p className="text-sm text-gray-600">By {post.author}</p>
                        )}
                        {post.category && typeof post.category === 'object' && post.category.name && (
                            <Badge variant="secondary" className="text-xs">
                              {post.category.name}
                            </Badge>
                        )}
                      </div>
                    </div>

                    {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {post.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                          ))}
                          {post.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{post.tags.length - 3}
                              </Badge>
                          )}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEdit(post)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(post._id)}
                          disabled={isDeleting === post._id}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        )}

        {paginatedPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No posts found</h3>
            <p className="text-gray-500">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'No blog posts have been created today (' + new Date().toLocaleDateString() + ')'}
            </p>
          </div>
        )}

        {editingPost && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-[1200px] max-h-[90vh] overflow-y-auto p-4">
                <div className="flex items-center justify-between p-6">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Blog Post</h2>
                  <button
                      onClick={closeDialog}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
               <BlogPostForm curruntPost={editingPost} categories={categories} onSuccess={handleSuccess} />
              </div>
            </div>
        )}
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  aria-disabled={currentPage === 1}
                  tabIndex={currentPage === 1 ? -1 : 0}
                  style={{ pointerEvents: currentPage === 1 ? 'none' : 'auto', opacity: currentPage === 1 ? 0.5 : 1 }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => (
                <PaginationItem key={i + 1}>
                  <PaginationLink
                    isActive={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>{i + 1}</span>
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  aria-disabled={currentPage === totalPages}
                  tabIndex={currentPage === totalPages ? -1 : 0}
                  style={{ pointerEvents: currentPage === totalPages ? 'none' : 'auto', opacity: currentPage === totalPages ? 0.5 : 1 }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
  );
};

export default TodaysPostsPage; 