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
import { ImageIcon, Loader2, Save, Eye, X } from 'lucide-react';
import { apiFetch, apiFetchJsonTryPaths, apiUrl } from '@/lib/apiFetch';

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

type BlogFormState = {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  readTime: string;
  tags: string[];
  category: string;
  slug: string;
  articleSummary: string;
  faqs: { question: string; answer: string }[];
};

/** Response from POST /api/ai/draft/ or /api/generate-post/ (structured; backend defaults structured on). */
type GeneratePostApiResponse = {
  title?: string;
  content?: string;
  summary?: string;
  faqs?: string[];
};

/** "Q1|||A1" → { question: "Q1", answer: "A1" } */
function parseFaqPipeStrings(items: string[]): { question: string; answer: string }[] {
  return items
    .map((s) => {
      const t = String(s).trim();
      if (!t) return null;
      const idx = t.indexOf('|||');
      if (idx === -1) return { question: t, answer: '' };
      return { question: t.slice(0, idx).trim(), answer: t.slice(idx + 3).trim() };
    })
    .filter((x): x is { question: string; answer: string } => Boolean(x && (x.question || x.answer)));
}

/** Tags from the first `maxWords` words of the title (normalized, deduped). */
function tagsFromTitleWords(title: string, maxWords = 5): string[] {
  const words = title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .map((w) => w.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())
    .filter(Boolean);
  return [...new Set(words)];
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

  const [form, setForm] = useState<BlogFormState>({
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
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState('');

  const handleInputChange = (field: string, value: unknown) => {
    if (field === 'title') {
      setForm((prev) => {
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
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    setForm((prev) => {
      const faqs = [...prev.faqs];
      faqs[index][field] = value;
      return { ...prev, faqs };
    });
  };
  const addFaq = () => {
    setForm((prev) => ({ ...prev, faqs: [...prev.faqs, { question: '', answer: '' }] }));
  };
  const removeFaq = (index: number) => {
    setForm((prev) => {
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
      if (!form.tags.includes(tagInput.trim())) {
        setForm((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
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

  const handleGenerateWithAi = async () => {
    const title = form.title.trim();
    if (!title) {
      toast.error('Please enter a title first');
      return;
    }

    setIsAiGenerating(true);
    try {
      const paths = [
        (import.meta.env.VITE_API_AI_DRAFT_PATH as string) || '/api/ai/draft/',
        '/api/generate-post/',
      ];
      const data = await apiFetchJsonTryPaths<GeneratePostApiResponse>(paths, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      const raw = data as unknown as Record<string, unknown>;
      const content =
        (typeof data.content === 'string' && data.content) ||
        (typeof raw.Content === 'string' && raw.Content) ||
        '';
      if (!content.trim()) {
        toast.error('AI returned empty content');
        return;
      }

      const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
      const faqRows = parseFaqPipeStrings(Array.isArray(data.faqs) ? data.faqs : []);
      const faqsNext = faqRows.length > 0 ? faqRows : [{ question: '', answer: '' }];
      const tagsNext = tagsFromTitleWords(title);

      // On submit, `faqs_json` is built as JSON.stringify(form.faqs) — keep [{ question, answer }, ...] in state.
      setForm((prev) => ({
        ...prev,
        content,
        ...(summary ? { excerpt: summary, articleSummary: summary } : {}),
        faqs: faqsNext,
        tags: tagsNext,
      }));

      toast.success('Draft generated — review before publishing');
    } catch (err) {
      console.error('AI generate failed:', err);
      toast.error(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.content || !form.category || !form.slug) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('excerpt', form.excerpt);
      payload.append('content', form.content);
      payload.append('author', form.author);
      payload.append('read_time', form.readTime || '');
      payload.append('category', form.category || '');
      payload.append('slug', form.slug);
      // Public site only shows published posts for non-staff users.
      payload.append('status', 'published');
      payload.append('article_summary', form.articleSummary);
      payload.append('faqs_json', JSON.stringify(form.faqs));
      payload.append('tags', JSON.stringify(form.tags));

      if (selectedImage instanceof File) {
        payload.append('image', selectedImage);
      }

      const url = isEditing
        ? apiUrl(`/api/posts/${curruntPost?._id}/`)
        : apiUrl('/api/posts/');
      const method = isEditing ? 'PATCH' : 'POST';

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
        setForm({
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
                    value={form.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter blog post title..."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={form.slug}
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
                    value={form.excerpt}
                    onChange={(e) => handleInputChange('excerpt', e.target.value)}
                    placeholder="Brief description..."
                    rows={3}
                  />
                </div>

                <div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                    <Label>Content *</Label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isAiGenerating || isSubmitting}
                      onClick={() => void handleGenerateWithAi()}
                      className="shrink-0"
                    >
                      {isAiGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>🤖 Generate with AI</>
                      )}
                    </Button>
                  </div>
                  <RichTextEditor
                    content={form.content}
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
                  value={form.articleSummary}
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
                {form.faqs.map((faq, idx) => (
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
                    value={form.author}
                    onChange={(e) => handleInputChange('author', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="readTime">Read Time</Label>
                  <Input
                    id="readTime"
                    value={form.readTime}
                    onChange={(e) => handleInputChange('readTime', e.target.value)}
                    placeholder="e.g., 5 min"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={form.category}
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
                    {form.tags.map((tag) => (
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
              <h1>{form.title || 'Untitled Post'}</h1>
              {imagePreview && (
                <img src={imagePreview} alt="Featured" className="w-full h-64 object-cover rounded-lg" />
              )}
              {form.excerpt && <p className="text-gray-600 italic">{form.excerpt}</p>}
              <div dangerouslySetInnerHTML={{ __html: form.content }} />
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
