import { useState, useEffect, useMemo } from 'react';
import Dashboard, { type DashboardPost, type PostViewsAnalytics } from './Dashboard';
import { apiFetchJson } from '@/lib/apiFetch';

export type { DashboardPost, PostViewsAnalytics };

interface CategoryRow {
  id: number;
  _id: string;
  name: string;
}

const Index = () => {
  const [posts, setPosts] = useState<DashboardPost[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [analytics, setAnalytics] = useState<PostViewsAnalytics | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPostsLoading(true);
    setError(null);

    fetch("https://django-how-to-earn-money.onrender.com/api/posts/", {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        setPosts(Array.isArray(data?.posts) ? data.posts : []);
      })
      .catch((err) => {
        console.error(err);
        setPosts([]);
        setError('Could not load dashboard posts.');
      })
      .finally(() => setPostsLoading(false));
  }, []);

  useEffect(() => {
    const fetchMeta = async () => {
      setMetaLoading(true);
      try {
        const categoriesRes = await apiFetchJson<{ categories: CategoryRow[] }>('/api/categories/');
        setCategories(Array.isArray(categoriesRes.categories) ? categoriesRes.categories : []);
      } catch {
        setCategories([]);
      }

      try {
        const a = await apiFetchJson<PostViewsAnalytics>('/api/analytics/post-views/');
        setAnalytics(a && Array.isArray(a.chart_series) ? a : null);
      } catch {
        setAnalytics(null);
      } finally {
        setMetaLoading(false);
      }
    };
    fetchMeta();
  }, []);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => b.id - a.id),
    [posts]
  );

  const loading = postsLoading || metaLoading;

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div>
      <Dashboard posts={sortedPosts} categories={categories} analytics={analytics} />
    </div>
  );
};

export default Index;
