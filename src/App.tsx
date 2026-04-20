import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {BrowserRouter, Routes, Route} from "react-router-dom";
import {Layout} from "@/components/Layout";
import Index from "@/pages/Index";
import PostsPage from "@/pages/Posts";
import TodaysPostsPage from "@/pages/TodaysPosts";
import CategoriesPage from "@/pages/Categories";
import CreatePostPage from "@/pages/CreatePost";
import NewsletterReviewsPage from "@/pages/NewsletterReviews";
import NewsletterPage from "@/pages/Newsletter";
import NotFound from "@/pages/NotFound";
import ContactPage from "@/pages/Contact";
import BlogDetails from "@/pages/BlogDetails";
import SuccessStoryPage from "@/pages/SuccessStory";
import NotificationsPage from "@/pages/Notifications";
import LoginPage from "@/pages/Login";
import { AuthProvider } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <TooltipProvider>
                <Toaster/>
                <Sonner/>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route element={<RequireAuth><Layout /></RequireAuth>}>
                            <Route path="/" element={<Index />} />
                            <Route path="/posts" element={<PostsPage />} />
                            <Route path="/todays-posts" element={<TodaysPostsPage />} />
                            <Route path="/categories" element={<CategoriesPage />} />
                            <Route path="/create-post/:postId" element={<CreatePostPage />} />
                            <Route path="/create-post" element={<CreatePostPage />} />
                            <Route path="/newsletter-reviews" element={<NewsletterReviewsPage />} />
                            <Route path="/newsletter" element={<NewsletterPage />} />
                            <Route path="/contact" element={<ContactPage />} />
                            <Route path="/notifications" element={<NotificationsPage />} />
                            <Route path="/posts/:blogId" element={<BlogDetails />} />
                            <Route path="/success-stories" element={<SuccessStoryPage />} />
                            <Route path="*" element={<NotFound />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </TooltipProvider>
        </AuthProvider>
    </QueryClientProvider>
);

export default App;
