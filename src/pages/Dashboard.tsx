import ViewsChart from "../components/ViewsChart";
import { FileText, Folder, Activity, DollarSign, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { stripHtml } from '@/lib/html';
import { useMemo } from 'react';

export interface DashboardPost {
  id: number;
  title: string;
  content: string;
  created_at?: string | null;
  views_count?: number;
}

export interface PostViewsAnalytics {
  top_viewed: { id: number; title: string; slug: string; views_count: number; status: string }[];
  chart_series: { label: string; views: number }[];
  posts: { id: number; title: string; slug: string; views_count: number; status: string }[];
}

export default function Dashboard({
  posts,
  categories,
  analytics,
}: {
  posts: DashboardPost[];
  categories: { _id?: string; name?: string }[];
  analytics: PostViewsAnalytics | null;
}) {
  const contentOverviewData = useMemo(() => {
    const now = new Date();
    const months: { key: string; name: string; posts: number; views: number }[] = [];
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: monthKey(d),
        name: d.toLocaleString('en-US', { month: 'short' }),
        posts: 0,
        views: 0,
      });
    }

    const map = new Map(months.map((m) => [m.key, m]));
    posts.forEach((post) => {
      const created = post.created_at ? new Date(post.created_at) : null;
      if (!created || Number.isNaN(created.getTime())) return;
      const key = monthKey(created);
      const month = map.get(key);
      if (!month) return;
      month.posts += 1;
      const plain = stripHtml(post.content || '');
      const vc = typeof post.views_count === 'number' ? post.views_count : null;
      month.views += vc !== null ? vc : Math.max(1, Math.ceil(plain.length / 40));
    });

    return months;
  }, [posts]);

  const totalViews = useMemo(() => {
    if (analytics?.posts?.length) {
      return analytics.posts.reduce((s, p) => s + (p.views_count || 0), 0);
    }
    return contentOverviewData.reduce((sum, m) => sum + m.views, 0);
  }, [analytics, contentOverviewData]);

  const totalRevenue = useMemo(() => {
    return (totalViews * 0.35).toFixed(2);
  }, [totalViews]);

  const activeNow = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return posts.filter((p) => {
      if (!p.created_at) return false;
      const created = new Date(p.created_at).getTime();
      return !Number.isNaN(created) && now - created <= oneDayMs;
    }).length;
  }, [posts]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue}</div>
            <p className="text-xs text-muted-foreground">Estimated from recorded page views</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.length}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Available categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeNow}</div>
            <p className="text-xs text-muted-foreground">Posts created in last 24 hours</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Content Overview</CardTitle>
              <CardDescription>Monthly posts and views (views use per-post counts when available).</CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <a href="#">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={contentOverviewData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="views" stroke="#8884d8" fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="posts" stroke="#82ca9d" fillOpacity={1} fill="url(#colorPosts)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest blog posts and updates</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8">
            {posts.slice(0, 5).map((post) => {
              const excerpt = stripHtml(post.content || '').slice(0, 80);
              return (
                <div key={post.id} className="flex items-center gap-4">
                  <div className="grid gap-1 min-w-0 flex-1">
                    <p className="text-sm font-medium leading-none truncate">{post.title || 'Untitled Post'}</p>
                    <p className="text-sm text-muted-foreground truncate">{excerpt || '—'}</p>
                  </div>
                  <div className="ml-auto font-medium shrink-0 text-muted-foreground text-xs text-right">
                    <div>#{post.id}</div>
                    {typeof post.views_count === 'number' && (
                      <div className="text-[10px]">{post.views_count} views</div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {analytics && analytics.chart_series.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Post views (low → high)</CardTitle>
              <CardDescription>
                Each bar is total page views for that post.
              </CardDescription>
            </CardHeader>

            <CardContent className="pl-0">
              <ViewsChart data={analytics.chart_series.slice(0, 10)} />
            </CardContent>
          </Card>
          {/* <Card>
            <CardHeader>
              <CardTitle>Post views (low → high)</CardTitle>
              <CardDescription>Each bar is total page views for that post.</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <ResponsiveContainer width="100%" height={420}>
                <BarChart
                  layout="vertical"
                  data={analytics.chart_series}
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="label" type="category" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="views" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card> */}
          <Card>
            <CardHeader>
              <CardTitle>Most viewed posts</CardTitle>
              <CardDescription>Top posts by view count</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.top_viewed.slice(0, 12).map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0">
                  <p className="text-sm font-medium truncate min-w-0">{row.title}</p>
                  <span className="text-sm text-muted-foreground shrink-0">{row.views_count} views</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
