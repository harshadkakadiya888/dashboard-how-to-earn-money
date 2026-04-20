import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BlogPostForm from '@/components/BlogPostForm';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiFetchJson } from '@/lib/apiFetch';

interface CategoryRow {
  _id: string;
  name: string;
}

interface PostApi {
  id: number;
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  read_time: string;
  featured_image: string | null;
  category: { id: number; _id: string; name: string };
  tags: string[];
  article_summary?: string;
  articleSummary?: string;
  faqs: { question: string; answer: string }[];
}

const CreatePostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [curruntPost, setCurruntPost] = useState<
    | {
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
    | undefined
  >(undefined);
  const [loading, setLoading] = useState(!!postId);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetchJson<{ categories: CategoryRow[] }>('/api/categories/');
        setCategories(res.categories ?? []);
      } catch {
        toast.error('Failed to load categories for the form');
        setCategories([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!postId) {
      setCurruntPost(undefined);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetchJson<PostApi>(`/api/posts/${postId}/`);
        setCurruntPost({
          _id: String(data.id),
          excerpt: data.excerpt ?? '',
          title: data.title,
          content: data.content,
          author: data.author ?? '',
          readTime: data.read_time ?? '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          category: data.category,
          image: data.featured_image ?? '',
          slug: data.slug,
          articleSummary: data.articleSummary ?? data.article_summary ?? '',
          faqs:
            Array.isArray(data.faqs) && data.faqs.length
              ? data.faqs
              : [{ question: '', answer: '' }],
        });
      } catch {
        toast.error('Failed to load post');
        navigate('/posts');
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{postId ? 'Edit Blog Post' : 'Create New Blog Post'}</CardTitle>
        <CardDescription>
          {postId
            ? 'Update your post below.'
            : 'Fill out the form below to publish a new article.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BlogPostForm
          key={postId ?? 'new'}
          categories={categories}
          onSuccess={() => {}}
          curruntPost={curruntPost}
        />
      </CardContent>
    </Card>
  );
};

export default CreatePostPage;
