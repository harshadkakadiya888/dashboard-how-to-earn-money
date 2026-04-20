import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RichTextEditor from './RichTextEditor';
import { toast } from 'sonner';
import { ImageIcon, Save, Eye, X } from 'lucide-react';
import { apiFetch, apiUrl } from '@/lib/apiFetch';

interface Category {
  _id: string;
  name: string;
}

interface CurruntPost {
  _id: string;
  excerpt: string;
  title: string;
  content: string;
  author: string;
  readTime?: string;
  tags: string[];
  category: string | { _id: string; name: string };
  image: string;
  slug: string;
  articleSummary: string;
  faqs: { question: string; answer: string }[];
}

interface BlogPostFormProps {
  categories: Category[];
  onSuccess: () => void;
  curruntPost?: CurruntPost;
}

/** Same key as AuthContext — username is used as Post.author for notification routing. */
function defaultAuthorFromSession(): string {
  try {
    const raw = localStorage.getItem('auth:user');
    if (!raw) return '';
    const u = JSON.parse(raw) as { username?: string };
    return (u.username || '').trim();
  } catch {
    return '';
  }
}

const BlogPostForm = ({ categories, onSuccess, curruntPost }: BlogPostFormProps) => {
  const isEditing = !!curruntPost?._id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: curruntPost?.title || '',
    excerpt: curruntPost?.excerpt || '',
    content: curruntPost?.content || '',
    author: curruntPost?.author || (!isEditing ? defaultAuthorFromSession() : ''),
    readTime: curruntPost?.readTime || '',
    tags: Array.isArray(curruntPost?.tags)
      ? curruntPost.tags
      : curruntPost?.tags
        ? [curruntPost.tags]
        : [],
    category: typeof curruntPost?.category === 'object' ? curruntPost.category._id : curruntPost?.category || '',
    slug: curruntPost?.slug || '',
    articleSummary: curruntPost?.articleSummary || '',
    faqs: curruntPost?.faqs || [{ question: '', answer: '' }],
  });

  const [selectedImage, setSelectedImage] = useState<File | string | null>(curruntPost?.image || null);
  const [imagePreview, setImagePreview] = useState<string>(curruntPost?.image || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState('');

  const handleInputChange = (field: string, value: unknown) => {
    if (field === 'title') {
      setFormData((prev) => {
        const title = String(value);
        const next = { ...prev, title };
        if (!prev.slug) {
          next.slug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        }
        return next;
      });
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData((prev) => {
      const faqs = [...prev.faqs];
      faqs[index][field] = value;
      return { ...prev, faqs };
    });
  };
  const addFaq = () => {
    setFormData((prev) => ({ ...prev, faqs: [...prev.faqs, { question: '', answer: '' }] }));
  };
  const removeFaq = (index: number) => {
    setFormData((prev) => {
      const faqs = prev.faqs.filter((_, i) => i !== index);
      return { ...prev, faqs };
    });
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setSelectedImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content || !formData.category || !formData.slug) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('excerpt', formData.excerpt);
      payload.append('content', formData.content);
      payload.append('author', formData.author);
      payload.append('read_time', formData.readTime || '');
      payload.append('category', formData.category || '');
      payload.append('slug', formData.slug);
      payload.append('article_summary', formData.articleSummary);
      payload.append('faqs_json', JSON.stringify(formData.faqs));
      payload.append('tags', JSON.stringify(formData.tags));

      if (selectedImage instanceof File) {
        payload.append('image', selectedImage);
      }

      const url = isEditing
        ? apiUrl(`/api/posts/${curruntPost?._id}/`)
        : apiUrl('/api/posts/');
      const method = isEditing ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: payload,
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = 'Failed to submit blog post';
        try {
          const err = text ? JSON.parse(text) : {};
          if (typeof err.detail === 'string') msg = err.detail;
          else if (err && typeof err === 'object') msg = JSON.stringify(err);
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      if (!isEditing) {
        setFormData({
          title: '',
          excerpt: '',
          content: '',
          author: '',
          readTime: '',
          tags: [],
          category: '',
          slug: '',
          articleSummary: '',
          faqs: [{ question: '', answer: '' }],
        });
        setSelectedImage(null);
        setImagePreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }

      toast.success(isEditing ? 'Blog post updated successfully!' : 'Blog post created successfully!');
      onSuccess();
      navigate('/posts');
    } catch (error) {
      console.error('Submit failed:', error);
      toast.error('Failed to submit blog post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter blog post title..."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    placeholder="blog-post-url-slug"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL-friendly version of the title. Auto-generates from title if left empty.
                  </p>
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => handleInputChange('excerpt', e.target.value)}
                    placeholder="Brief description..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Content *</Label>
                  <RichTextEditor
                    content={formData.content}
                    onChange={(content) => handleInputChange('content', content)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Article Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="articleSummary"
                  value={formData.articleSummary}
                  onChange={(e) => handleInputChange('articleSummary', e.target.value)}
                  placeholder="Short summary of the article..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FAQs</CardTitle>
              </CardHeader>
              <CardContent>
                {formData.faqs.map((faq, idx) => (
                  <div key={idx} className="mb-4 flex gap-2 items-center">
                    <Input
                      placeholder="Question"
                      value={faq.question}
                      onChange={(e) => handleFaqChange(idx, 'question', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Answer"
                      value={faq.answer}
                      onChange={(e) => handleFaqChange(idx, 'answer', e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" variant="destructive" onClick={() => removeFaq(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addFaq}>
                  Add FAQ
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Featured Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Featured"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeImage}
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {selectedImage ? 'Change Image' : 'Select Image'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {selectedImage instanceof File && (
                  <p className="text-xs text-gray-500">
                    Selected: {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Post Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => handleInputChange('author', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="readTime">Read Time</Label>
                  <Input
                    id="readTime"
                    value={formData.readTime}
                    onChange={(e) => handleInputChange('readTime', e.target.value)}
                    placeholder="e.g., 5 min"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => handleInputChange('category', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.length > 0 &&
                        categories?.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center bg-gray-200 rounded px-2 py-1 text-xs font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          className="ml-1 text-gray-500 hover:text-red-500"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={handleTagInputChange}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Type a tag and press Enter or comma"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setShowPreview(!showPreview)} className="flex-1">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting
              ? isEditing
                ? 'Updating...'
                : 'Publishing...'
              : isEditing
                ? 'Update'
                : 'Publish'}
          </Button>
        </div>
      </form>

      {showPreview && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none rich-text-content">
              <h1>{formData.title || 'Untitled Post'}</h1>
              {imagePreview && (
                <img src={imagePreview} alt="Featured" className="w-full h-64 object-cover rounded-lg" />
              )}
              {formData.excerpt && <p className="text-gray-600 italic">{formData.excerpt}</p>}
              <div dangerouslySetInnerHTML={{ __html: formData.content }} />
            </div>
          </CardContent>
        </Card>
      )}
      <style>{`
          .rich-text-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
            table-layout: fixed;
          }
          .rich-text-content th, .rich-text-content td {
            border: 1px solid #d1d5db;
            padding: 8px;
            min-width: 40px;
            position: relative;
            vertical-align: top;
          }
          .rich-text-content th {
            background: #f3f4f6;
            font-weight: bold;
          }
        `}</style>
    </div>
  );
};

export default BlogPostForm;
