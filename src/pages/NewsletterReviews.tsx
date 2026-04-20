import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Trash2, Star, Mail, User, MessageSquare, Calendar, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NewsletterReview {
  _id: string;
  rating: number;
  name: string;
  review: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

const NewsletterReviewsPage = () => {
  const [reviews, setReviews] = useState<NewsletterReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Create/Edit form states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<NewsletterReview | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rating: 5,
    review: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Get URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const searchParam = urlParams.get('search');
    
    if (pageParam) {
      const page = parseInt(pageParam);
      if (page > 0) {
        setCurrentPage(page);
      }
    }
    if (searchParam) {
      setSearchTerm(searchParam);
      setDebouncedSearchTerm(searchParam);
    }
  }, []);

  // Update URL when page or search changes
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
    fetchReviews();
  }, [currentPage, debouncedSearchTerm]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm || '',
      };
      const response = await apiClient.get('/api/newsletter-reviews', { params });
      const reviewsData = Array.isArray(response?.data?.data?.reviews) ? response.data.data.reviews : [];
      setReviews(reviewsData);
      setTotalPages(response?.data?.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    setIsDeleting(reviewId);
    try {
      await apiClient.delete(`/api/newsletter-reviews/${reviewId}`);
      toast.success('Review deleted successfully');
      fetchReviews();
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Failed to delete review');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.review.trim()) {
      toast.error('Email and review are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/newsletter-reviews', formData);
      toast.success('Review created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchReviews();
    } catch (error) {
      console.error('Failed to create review:', error);
      toast.error('Failed to create review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview || !formData.email.trim() || !formData.review.trim()) {
      toast.error('Email and review are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.put(`/api/newsletter-reviews/${editingReview._id}`, formData);
      toast.success('Review updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      fetchReviews();
    } catch (error) {
      console.error('Failed to update review:', error);
      toast.error('Failed to update review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (review: NewsletterReview) => {
    setEditingReview(review);
    setFormData({
      name: review.name || '',
      email: review.email,
      rating: review.rating,
      review: review.review
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      rating: 5,
      review: ''
    });
    setEditingReview(null);
  };

  // Handle search change - reset to page 1
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Prevent search input from losing focus during API calls
  useEffect(() => {
    const searchInput = searchInputRef.current;
    if (searchInput) {
      // Store cursor position before any re-render
      const storeCursorPosition = () => {
        const start = searchInput.selectionStart;
        const end = searchInput.selectionEnd;
        searchInput.dataset.cursorStart = start.toString();
        searchInput.dataset.cursorEnd = end.toString();
      };

      // Restore cursor position after re-render
      const restoreCursorPosition = () => {
        const start = parseInt(searchInput.dataset.cursorStart || '0');
        const end = parseInt(searchInput.dataset.cursorEnd || '0');
        if (start >= 0 && end >= 0) {
          searchInput.setSelectionRange(start, end);
        }
      };

      searchInput.addEventListener('beforeinput', storeCursorPosition);
      searchInput.addEventListener('input', restoreCursorPosition);

      return () => {
        searchInput.removeEventListener('beforeinput', storeCursorPosition);
        searchInput.removeEventListener('input', restoreCursorPosition);
      };
    }
  }, []);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderStarInput = (rating: number, onChange: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onChange(index + 1)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 cursor-pointer transition-colors ${
                index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div>Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Newsletter Reviews</h1>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Review
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Newsletter Review</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateReview} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name (Optional)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter name..."
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email..."
                    required
                  />
                </div>
                <div>
                  <Label>Rating *</Label>
                  <div className="mt-2">
                    {renderStarInput(formData.rating, (rating) => 
                      setFormData(prev => ({ ...prev, rating }))
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="review">Review *</Label>
                  <Textarea
                    id="review"
                    value={formData.review}
                    onChange={(e) => setFormData(prev => ({ ...prev, review: e.target.value }))}
                    placeholder="Write your review..."
                    rows={4}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((review) => (
          <Card key={review._id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-sm">{review.name || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(review.rating)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Mail className="w-3 h-3" />
                <span className="truncate">{review.email}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {review.review}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {new Date(review.createdAt).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(review)}
                  className="flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteReview(review._id)}
                  disabled={isDeleting === review._id}
                  className="flex-1"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {isDeleting === review._id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
            {(() => {
              const pages = [];
              const pageNumbers = [];
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
                style={{ pointerEvents: currentPage === totalPages ? 'none' : 'auto', opacity: currentPage === totalPages ? 0.5 : 1 }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {reviews.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <MessageSquare className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No reviews found</h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'No newsletter reviews have been submitted yet'
            }
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Newsletter Review</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateReview} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name (Optional)</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter name..."
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email..."
                required
              />
            </div>
            <div>
              <Label>Rating *</Label>
              <div className="mt-2">
                {renderStarInput(formData.rating, (rating) => 
                  setFormData(prev => ({ ...prev, rating }))
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-review">Review *</Label>
              <Textarea
                id="edit-review"
                value={formData.review}
                onChange={(e) => setFormData(prev => ({ ...prev, review: e.target.value }))}
                placeholder="Write your review..."
                rows={4}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Updating...' : 'Update'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsletterReviewsPage; 