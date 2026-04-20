import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Trash2, Edit, Plus, User, Mail, CheckCircle, X } from 'lucide-react';
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

interface SuccessStory {
  _id: string;
  fullName: string;
  email: string;
  monthlyIncomeBefore: number;
  monthlyIncomeNow: number;
  timeToTransform: string;
  primaryStrategyUsed: string;
  journey: string;
  publishPermission: boolean;
  createdAt: string;
  updatedAt: string;
}

const SuccessStoryPage = () => {
  const [stories, setStories] = useState<SuccessStory[]>([]);
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
  const [editingStory, setEditingStory] = useState<SuccessStory | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    monthlyIncomeBefore: '',
    monthlyIncomeNow: '',
    timeToTransform: '',
    primaryStrategyUsed: '',
    journey: '',
    publishPermission: false,
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
    fetchStories();
  }, [currentPage, debouncedSearchTerm]);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm || '',
      };
      const response = await apiClient.get('/api/success-stories', { params });
      const storiesData = Array.isArray(response?.data?.data?.successStories)
        ? response.data.data.successStories
        : Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      setStories(storiesData);
      setTotalPages(response?.data?.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch success stories:', error);
      toast.error('Failed to load success stories');
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this success story?')) {
      return;
    }
    setIsDeleting(storyId);
    try {
      await apiClient.delete(`/api/success-stories/${storyId}`);
      toast.success('Success story deleted successfully');
      fetchStories();
    } catch (error) {
      console.error('Failed to delete success story:', error);
      toast.error('Failed to delete success story');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.monthlyIncomeBefore || !formData.monthlyIncomeNow || !formData.timeToTransform.trim() || !formData.primaryStrategyUsed.trim() || !formData.journey.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/success-stories', {
        ...formData,
        monthlyIncomeBefore: Number(formData.monthlyIncomeBefore),
        monthlyIncomeNow: Number(formData.monthlyIncomeNow),
      });
      toast.success('Success story created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchStories();
    } catch (error) {
      console.error('Failed to create success story:', error);
      toast.error('Failed to create success story');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory || !formData.fullName.trim() || !formData.email.trim() || !formData.monthlyIncomeBefore || !formData.monthlyIncomeNow || !formData.timeToTransform.trim() || !formData.primaryStrategyUsed.trim() || !formData.journey.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.put(`/api/success-stories/${editingStory._id}`, {
        ...formData,
        monthlyIncomeBefore: Number(formData.monthlyIncomeBefore),
        monthlyIncomeNow: Number(formData.monthlyIncomeNow),
      });
      toast.success('Success story updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      fetchStories();
    } catch (error) {
      console.error('Failed to update success story:', error);
      toast.error('Failed to update success story');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (story: SuccessStory) => {
    setEditingStory(story);
    setFormData({
      fullName: story.fullName,
      email: story.email,
      monthlyIncomeBefore: story.monthlyIncomeBefore.toString(),
      monthlyIncomeNow: story.monthlyIncomeNow.toString(),
      timeToTransform: story.timeToTransform,
      primaryStrategyUsed: story.primaryStrategyUsed,
      journey: story.journey,
      publishPermission: story.publishPermission,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      monthlyIncomeBefore: '',
      monthlyIncomeNow: '',
      timeToTransform: '',
      primaryStrategyUsed: '',
      journey: '',
      publishPermission: false,
    });
    setEditingStory(null);
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
      const storeCursorPosition = () => {
        const start = searchInput.selectionStart;
        const end = searchInput.selectionEnd;
        searchInput.dataset.cursorStart = start.toString();
        searchInput.dataset.cursorEnd = end.toString();
      };
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
    return <div>Loading success stories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Success Stories</h1>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search success stories..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Story
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Success Story</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateStory} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter full name..."
                    required
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
                  <Label htmlFor="monthlyIncomeBefore">Monthly Income Before *</Label>
                  <Input
                    id="monthlyIncomeBefore"
                    type="number"
                    value={formData.monthlyIncomeBefore}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthlyIncomeBefore: e.target.value }))}
                    placeholder="e.g. 10000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyIncomeNow">Monthly Income Now *</Label>
                  <Input
                    id="monthlyIncomeNow"
                    type="number"
                    value={formData.monthlyIncomeNow}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthlyIncomeNow: e.target.value }))}
                    placeholder="e.g. 50000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="timeToTransform">Time to Transform *</Label>
                  <Input
                    id="timeToTransform"
                    value={formData.timeToTransform}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeToTransform: e.target.value }))}
                    placeholder="e.g. 6 months"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="primaryStrategyUsed">Primary Strategy Used *</Label>
                  <Input
                    id="primaryStrategyUsed"
                    value={formData.primaryStrategyUsed}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryStrategyUsed: e.target.value }))}
                    placeholder="e.g. Investing, Trading, etc."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="journey">Journey *</Label>
                  <Textarea
                    id="journey"
                    value={formData.journey}
                    onChange={(e) => setFormData(prev => ({ ...prev, journey: e.target.value }))}
                    placeholder="Describe your journey..."
                    rows={4}
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="publishPermission"
                    type="checkbox"
                    checked={formData.publishPermission}
                    onChange={e => setFormData(prev => ({ ...prev, publishPermission: e.target.checked }))}
                  />
                  <Label htmlFor="publishPermission">I give permission to publish my story</Label>
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
        {stories.map((story) => (
          <Card key={story._id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-sm">
                    {story.fullName}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(story)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteStory(story._id)}
                    disabled={isDeleting === story._id}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Mail className="w-3 h-3" />
                <span className="truncate">{story.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Before: ₹{story.monthlyIncomeBefore}</span>
                <span>Now: ₹{story.monthlyIncomeNow}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Time to Transform: {story.timeToTransform}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Strategy: {story.primaryStrategyUsed}</span>
              </div>
              <div className="text-gray-700 text-sm">
                {story.journey}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {story.publishPermission ? (
                  <span className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-1" /> Publish Allowed</span>
                ) : (
                  <span className="flex items-center text-gray-400"><X className="w-4 h-4 mr-1" /> Not Allowed</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Submitted: {new Date(story.createdAt).toLocaleDateString()}</span>
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
      {stories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <User className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No success stories found</h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'No success stories have been submitted yet'
            }
          </p>
        </div>
      )}
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Success Story</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStory} className="space-y-4">
            <div>
              <Label htmlFor="edit-fullName">Full Name *</Label>
              <Input
                id="edit-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter full name..."
                required
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
              <Label htmlFor="edit-monthlyIncomeBefore">Monthly Income Before *</Label>
              <Input
                id="edit-monthlyIncomeBefore"
                type="number"
                value={formData.monthlyIncomeBefore}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyIncomeBefore: e.target.value }))}
                placeholder="e.g. 10000"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-monthlyIncomeNow">Monthly Income Now *</Label>
              <Input
                id="edit-monthlyIncomeNow"
                type="number"
                value={formData.monthlyIncomeNow}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyIncomeNow: e.target.value }))}
                placeholder="e.g. 50000"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-timeToTransform">Time to Transform *</Label>
              <Input
                id="edit-timeToTransform"
                value={formData.timeToTransform}
                onChange={(e) => setFormData(prev => ({ ...prev, timeToTransform: e.target.value }))}
                placeholder="e.g. 6 months"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-primaryStrategyUsed">Primary Strategy Used *</Label>
              <Input
                id="edit-primaryStrategyUsed"
                value={formData.primaryStrategyUsed}
                onChange={(e) => setFormData(prev => ({ ...prev, primaryStrategyUsed: e.target.value }))}
                placeholder="e.g. Investing, Trading, etc."
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-journey">Journey *</Label>
              <Textarea
                id="edit-journey"
                value={formData.journey}
                onChange={(e) => setFormData(prev => ({ ...prev, journey: e.target.value }))}
                placeholder="Describe your journey..."
                rows={4}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="edit-publishPermission"
                type="checkbox"
                checked={formData.publishPermission}
                onChange={e => setFormData(prev => ({ ...prev, publishPermission: e.target.checked }))}
              />
              <Label htmlFor="edit-publishPermission">I give permission to publish my story</Label>
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

export default SuccessStoryPage;