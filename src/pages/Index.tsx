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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [postsRes, categoriesRes] = await Promise.all([
          apiFetchJson<{ posts: DashboardPost[] }>('/api/posts/'),
          apiFetchJson<{ categories: CategoryRow[] }>('/api/categories/'),
        ]);
        setPosts(Array.isArray(postsRes.posts) ? postsRes.posts : []);
        setCategories(Array.isArray(categoriesRes.categories) ? categoriesRes.categories : []);
        try {
          const a = await apiFetchJson<PostViewsAnalytics>('/api/analytics/post-views/');
          setAnalytics(a && Array.isArray(a.chart_series) ? a : null);
        } catch {
          setAnalytics(null);
        }
      } catch (e) {
        console.error('Error fetching data:', e);
        setError('Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => b.id - a.id),
    [posts]
  );

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
