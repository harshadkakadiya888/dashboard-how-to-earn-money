import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Trash2, Edit, Mail, User, Plus, X, Save, XCircle } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';

interface Newsletter {
  _id: string;
  name: string;
  email: string;
  interestedCategories: Array<{
    _id: string;
    name: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  _id: string;
  name: string;
  image?: string;
}

const NewsletterPage = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    interestedCategories: [] as string[]
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
    fetchData();
  }, [currentPage, debouncedSearchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm || '',
      };
      const [newslettersRes, categoriesRes] = await Promise.all([
        apiClient.get('/api/newsletter', { params }),
        apiClient.get('/api/categories'),
      ]);
      const newslettersData = Array.isArray(newslettersRes?.data?.data?.subscribers) ? newslettersRes.data.data.subscribers : [];
      setNewsletters(newslettersData);
      setCategories(categoriesRes?.data?.data?.categories || []);
      setTotalPages(newslettersRes?.data?.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load newsletters');
      setNewsletters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNewsletter = async (newsletterId: string) => {
    if (!confirm('Are you sure you want to delete this newsletter subscription?')) {
      return;
    }

    setIsDeleting(newsletterId);
    try {
      await apiClient.delete(`/api/newsletter/${newsletterId}`);
      toast.success('Newsletter subscription deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete newsletter:', error);
      toast.error('Failed to delete newsletter subscription');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreateNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/newsletter', formData);
      toast.success('Newsletter subscription created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create newsletter:', error);
      toast.error('Failed to create newsletter subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNewsletter || !formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.put(`/api/newsletter/${editingNewsletter._id}`, formData);
      toast.success('Newsletter subscription updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to update newsletter:', error);
      toast.error('Failed to update newsletter subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setFormData({
      name: newsletter.name || '',
      email: newsletter.email,
      interestedCategories: newsletter.interestedCategories.map(cat => cat._id)
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      interestedCategories: []
    });
    setEditingNewsletter(null);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      interestedCategories: prev.interestedCategories.includes(categoryId)
        ? prev.interestedCategories.filter(id => id !== categoryId)
        : [...prev.interestedCategories, categoryId]
    }));
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

  if (loading) {
    return <div>Loading newsletters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Newsletter Subscriptions</h1>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search newsletters..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Newsletter Subscription</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateNewsletter} className="space-y-4">
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
                  <Label>Interested Categories</Label>
                  <div className="space-y-2 mt-2">
                    {categories.map((category) => (
                      <div key={category._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category._id}`}
                          checked={formData.interestedCategories.includes(category._id)}
                          onCheckedChange={() => handleCategoryToggle(category._id)}
                        />
                        <Label htmlFor={`category-${category._id}`} className="text-sm">
                          {category.name}
                        </Label>
                      </div>
                    ))}
                  </div>
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
        {newsletters.map((newsletter) => (
          <Card key={newsletter._id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-sm">
                    {newsletter.name || 'Anonymous'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(newsletter)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteNewsletter(newsletter._id)}
                    disabled={isDeleting === newsletter._id}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Mail className="w-3 h-3" />
                <span className="truncate">{newsletter.email}</span>
              </div>
              
              {newsletter.interestedCategories.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Interested Categories:</Label>
                  <div className="flex flex-wrap gap-1">
                    {newsletter.interestedCategories.map((category) => (
                      <Badge key={category._id} variant="secondary" className="text-xs">
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Subscribed: {new Date(newsletter.createdAt).toLocaleDateString()}</span>
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

      {newsletters.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Mail className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No newsletter subscriptions found</h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'No newsletter subscriptions have been created yet'
            }
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Newsletter Subscription</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateNewsletter} className="space-y-4">
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
              <Label>Interested Categories</Label>
              <div className="space-y-2 mt-2">
                {categories.map((category) => (
                  <div key={category._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-category-${category._id}`}
                      checked={formData.interestedCategories.includes(category._id)}
                      onCheckedChange={() => handleCategoryToggle(category._id)}
                    />
                    <Label htmlFor={`edit-category-${category._id}`} className="text-sm">
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
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

export default NewsletterPage; 