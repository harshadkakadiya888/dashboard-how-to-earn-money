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
    let cancelled = false;
    (async () => {
      setPostsLoading(true);
      setError(null);
      try {
        const data = await apiFetchJson<{ posts: DashboardPost[] }>('/api/posts/', { cache: 'no-store' });
        if (!cancelled) setPosts(Array.isArray(data?.posts) ? data.posts : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setPosts([]);
          setError(err instanceof Error ? err.message : 'Could not load dashboard posts.');
        }
      } finally {
        if (!cancelled) setPostsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
