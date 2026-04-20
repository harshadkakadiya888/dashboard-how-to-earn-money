import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiFetchJson, apiFetchVoid, apiUrl } from '@/lib/apiFetch';

interface Category {
  id: number;
  _id: string;
  name: string;
  image?: string | null;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

async function convertWebpToPng(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.');
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Failed to convert WEBP to PNG.'));
        return;
      }
      resolve(result);
    }, 'image/png');
  });

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return new File([blob], `${baseName}.png`, { type: 'image/png' });
}

async function prepareCategoryImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image must be smaller than 5MB.');
  }
  if (file.type === 'image/webp') {
    return convertWebpToPng(file);
  }
  return file;
}

function getApiErrorMessage(text: string, fallback: string): string {
  if (!text) return fallback;
  try {
    const err = JSON.parse(text) as Record<string, unknown>;
    if (typeof err.detail === 'string') return err.detail;
    const pairs = Object.entries(err).map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
      return `${key}: ${String(value)}`;
    });
    return pairs.length ? pairs.join(' | ') : fallback;
  } catch {
    return fallback;
  }
}

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>('');

  const readPreview = (file: File, onReady: (result: string) => void) => {
    const reader = new FileReader();
    reader.onload = (ev) => onReady(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiFetchJson<{ categories: Category[] }>('/api/categories/');
      setCategories(Array.isArray(res.categories) ? res.categories : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', newCategoryName.trim());
      if (newCategoryImage) {
        formData.append('image', newCategoryImage);
      }
      const res = await apiFetch(apiUrl('/api/categories/'), {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        const msg = getApiErrorMessage(text, 'Failed to create category');
        toast.error(msg);
        return;
      }
      setNewCategoryName('');
      setNewCategoryImage(null);
      setImagePreview('');
      await fetchCategories();
      toast.success('Category created successfully!');
    } catch (error) {
      console.error('Failed to create category:', error);
      toast.error('Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    setIsDeleting(categoryId);
    try {
      await apiFetchVoid(`/api/categories/${categoryId}/`, { method: 'DELETE' });
      await fetchCategories();
      toast.success('Category deleted successfully!');
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditCategory = async (categoryId: number) => {
    if (!editName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      if (editImage) {
        formData.append('image', editImage);
      }
      const res = await apiFetch(apiUrl(`/api/categories/${categoryId}/`), {
        method: 'PUT',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        const msg = getApiErrorMessage(text, 'Failed to update category');
        toast.error(msg);
        return;
      }
      setEditingCategory(null);
      setEditName('');
      setEditImage(null);
      setEditImagePreview('');
      await fetchCategories();
      toast.success('Category updated successfully!');
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('Failed to update category');
    }
  };

  const startEditing = (category: Category) => {
    setEditingCategory(category.id);
    setEditName(category.name);
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setEditName('');
  };

  if (loading) {
    return <div>Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCategory} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="categoryName" className="sr-only">
                Category Name
              </Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name..."
                required
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="categoryImage" className="sr-only">
                Category Image
              </Label>
              <Input
                id="categoryImage"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const prepared = await prepareCategoryImage(file);
                      setNewCategoryImage(prepared);
                      readPreview(prepared, setImagePreview);
                      if (prepared.type === 'image/png' && file.type === 'image/webp') {
                        toast.success('WEBP converted to PNG for reliable upload.');
                      }
                    } catch (err) {
                      const message = err instanceof Error ? err.message : 'Invalid image file.';
                      toast.error(message);
                      setNewCategoryImage(null);
                      setImagePreview('');
                      e.currentTarget.value = '';
                    }
                  } else {
                    setNewCategoryImage(null);
                    setImagePreview('');
                  }
                }}
              />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-2 max-h-24 rounded" />
              )}
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Existing Categories ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 && !loading ? (
            <div className="text-center py-8">
              <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No categories yet</h3>
              <p className="text-gray-500">Create your first category to organize your content</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(categories) &&
                categories.map((category) => (
                  <Card key={category.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      {editingCategory === category.id ? (
                        <div className="space-y-3">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Category name..."
                            autoFocus
                          />
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const prepared = await prepareCategoryImage(file);
                                  setEditImage(prepared);
                                  readPreview(prepared, setEditImagePreview);
                                  if (prepared.type === 'image/png' && file.type === 'image/webp') {
                                    toast.success('WEBP converted to PNG for reliable upload.');
                                  }
                                } catch (err) {
                                  const message = err instanceof Error ? err.message : 'Invalid image file.';
                                  toast.error(message);
                                  setEditImage(null);
                                  setEditImagePreview('');
                                  e.currentTarget.value = '';
                                }
                              } else {
                                setEditImage(null);
                                setEditImagePreview('');
                              }
                            }}
                          />
                          {category.image && !editImagePreview && (
                            <img src={category.image} alt="Current" className="mt-2 max-h-24 rounded" />
                          )}
                          {editImagePreview && (
                            <img src={editImagePreview} alt="Preview" className="mt-2 max-h-24 rounded" />
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditCategory(category.id)}
                              className="flex-1"
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing} className="flex-1">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {category.image && (
                            <img
                              src={category.image}
                              alt=""
                              className="w-full h-24 object-cover rounded"
                            />
                          )}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-sm font-medium">
                                {category.name}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEditing(category)}>
                                <Edit className="w-3 h-3 mr-1" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteCategory(category.id)}
                                disabled={isDeleting === category.id}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoriesPage;
