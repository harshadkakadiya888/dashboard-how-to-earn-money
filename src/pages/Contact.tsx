import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Trash2, Edit, Plus, Mail, User, MessageSquare } from 'lucide-react';
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

interface Contact {
  _id: string;
  fullName: string;
  emailAddress: string;
  subject: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

const ContactPage = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
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
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    emailAddress: '',
    subject: '',
    message: ''
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
    fetchContacts();
  }, [currentPage, debouncedSearchTerm]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm || '',
      };
      const response = await apiClient.get('/api/contact', { params });
      const contactsData = Array.isArray(response?.data?.data?.contacts)
        ? response.data.data.contacts
        : Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      setContacts(contactsData);
      setTotalPages(response?.data?.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      toast.error('Failed to load contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }
    setIsDeleting(contactId);
    try {
      await apiClient.delete(`/api/contact/${contactId}`);
      toast.success('Contact deleted successfully');
      fetchContacts();
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast.error('Failed to delete contact');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.emailAddress.trim() || !formData.message.trim()) {
      toast.error('Email and message are required');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/contact', formData);
      toast.success('Contact created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      console.error('Failed to create contact:', error);
      toast.error('Failed to create contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !formData.emailAddress.trim() || !formData.message.trim()) {
      toast.error('Email and message are required');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.put(`/api/contact/${editingContact._id}`, formData);
      toast.success('Contact updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      console.error('Failed to update contact:', error);
      toast.error('Failed to update contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      fullName: contact.fullName || '',
      emailAddress: contact.emailAddress,
      subject: contact.subject || '',
      message: contact.message || ''
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      emailAddress: '',
      subject: '',
      message: ''
    });
    setEditingContact(null);
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
    return <div>Loading contacts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contact Messages</h1>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contact</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateContact} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter full name..."
                  />
                </div>
                <div>
                  <Label htmlFor="emailAddress">Email *</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    value={formData.emailAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, emailAddress: e.target.value }))}
                    placeholder="Enter email..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter subject..."
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter message..."
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
        {contacts.map((contact) => (
          <Card key={contact._id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-sm">
                    {contact.fullName || 'Anonymous'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(contact)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteContact(contact._id)}
                    disabled={isDeleting === contact._id}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Mail className="w-3 h-3" />
                <span className="truncate">{contact.emailAddress}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MessageSquare className="w-3 h-3" />
                <span className="truncate">{contact.subject}</span>
              </div>
              <div className="text-gray-700 text-sm">
                {contact.message}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Received: {new Date(contact.createdAt).toLocaleDateString()}</span>
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
      {contacts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Mail className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No contacts found</h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'No contact messages have been received yet'
            }
          </p>
        </div>
      )}
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateContact} className="space-y-4">
            <div>
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter full name..."
              />
            </div>
            <div>
              <Label htmlFor="edit-emailAddress">Email *</Label>
              <Input
                id="edit-emailAddress"
                type="email"
                value={formData.emailAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, emailAddress: e.target.value }))}
                placeholder="Enter email..."
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter subject..."
              />
            </div>
            <div>
              <Label htmlFor="edit-message">Message *</Label>
              <Textarea
                id="edit-message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter message..."
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

export default ContactPage;