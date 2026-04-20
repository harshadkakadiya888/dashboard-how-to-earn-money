import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2, Eye, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import BlogPostForm from "@/components/BlogPostForm.tsx"; // Ensure this path is correct

interface BlogPost {
  _id: string;
  title: string;
  excerpt: string;
  author: string;
  category: string | { _id: string; name: string };
  tags: string[];
  image: string;
  createdAt: string;
  slug: string;
  articleSummary: string;
  faqs: { question: string; answer: string }[];
  content: string;
}

interface BlogPostListProps {
  posts: BlogPost[];
  onUpdate: () => void;
}

const BlogPostList = ({ posts, onUpdate }: BlogPostListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const filteredPosts = posts.filter(post => {
      const categoryName = typeof post.category === 'string' ? post.category : post.category?.name || '';
      return post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categoryName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setIsDeleting(postId);
    try {
      await apiClient.delete(`/api/blogs/${postId}`);
      toast.success('Post deleted successfully');
      onUpdate();
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

  const closeDialog = () => {
    setEditingPost(null);
  };

  return (
      <div className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
          />
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
              <Card key={post._id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      {post.author && (
                          <p className="text-sm text-gray-600">By {post.author}</p>
                      )}
                      {post.category && (
                          <Badge variant="secondary" className="text-xs">
                            {typeof post.category === 'string' ? post.category : post.category.name}
                          </Badge>
                      )}
                    </div>
                  </div>
                  {post.tags && post.tags.length > 0 && (
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
                    <Button size="sm" variant="outline" className="flex-1" type="button">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        type="button"
                        onClick={() => handleEdit(post)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        type="button"
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

        {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No posts found</h3>
              <p className="text-gray-500">
                {searchTerm
                    ? 'Try adjusting your search terms'
                    : 'Create your first blog post to get started'
                }
              </p>
            </div>
        )}

        {/* Edit Dialog */}
        {editingPost && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-[1200px] max-h-[90vh] overflow-y-auto p-4">
                {/* Dialog Header */}
                <div className="flex items-center justify-between p-6">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Blog Post</h2>
                  <button
                      onClick={closeDialog}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      type="button"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                {/* Dialog Content */}
                {/* Ensure the BlogPostForm accepts 'curruntPost' as a prop. If not, change prop name to 'currentPost' in both form and here. */}
                <BlogPostForm categories={[]} onSuccess={() => { onUpdate(); closeDialog(); }} curruntPost={editingPost}/>
              </div>
            </div>
        )}
      </div>
  );
};

export default BlogPostList;
