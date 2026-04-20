import { Bell, Home, FileText, Folder, Plus, Package2, Menu, Search, CircleUser, Clock, MessageSquare, Mail, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { apiFetchJson } from "@/lib/apiFetch";

const navItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/posts", icon: FileText, label: "Posts" },
    { href: "/todays-posts", icon: Clock, label: "Today's Posts" },
    { href: "/categories", icon: Folder, label: "Categories" },
    { href: "/newsletter-reviews", icon: MessageSquare, label: "Newsletter Reviews" },
    { href: "/newsletter", icon: Mail, label: "Newsletter" },
    { href: "/contact", icon: User, label: "Contact" },
    { href: "/success-stories", icon: CheckCircle, label: "Success Stories" },
];

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const { pathname } = useLocation();
    const isActive = pathname === href;
    return (
        <Link
            to={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${isActive ? "bg-muted text-primary" : ""}`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
};

export function Layout() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { pathname } = useLocation();
    const pathnames = pathname.split('/').filter(x => x);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const loadUnread = async () => {
            try {
                const data = await apiFetchJson<{ unread_count: number }>('/api/notifications/');
                setUnreadCount(typeof data.unread_count === 'number' ? data.unread_count : 0);
            } catch {
                setUnreadCount(0);
            }
        };
        loadUnread();
    }, [pathname]);

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-muted/40 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <Link to="/" className="flex items-center gap-2 font-semibold">
                            <Package2 className="h-6 w-6" />
                            <span className="">FinBolg Inc</span>
                        </Link>
                        <Button variant="outline" size="icon" className="ml-auto h-8 w-8 relative" onClick={() => navigate('/notifications')}>
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-red-500 text-[10px] text-white px-1 flex items-center justify-center">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                            <span className="sr-only">Toggle notifications</span>
                        </Button>
                    </div>
                    <div className="flex-1">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                            {navItems.map(item => <NavLink key={item.href} {...item} />)}
                        </nav>
                    </div>
                    <div className="mt-auto p-4">
                        <Link to="/create-post">
                            <Button size="sm" className="w-full">
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Post
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0 md:hidden"
                            >
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col">
                            <nav className="grid gap-2 text-lg font-medium">
                                <Link
                                    to="#"
                                    className="flex items-center gap-2 text-lg font-semibold"
                                >
                                    <Package2 className="h-6 w-6" />
                                    <span className="sr-only">FinBolg Inc</span>
                                </Link>
                                {navItems.map(item => <NavLink key={item.href} {...item} />)}
                            </nav>
                            <div className="mt-auto">
                                <Link to="/create-post">
                                    <Button size="sm" className="w-full">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create New Post
                                    </Button>
                                </Link>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <div className="w-full flex-1">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link to="/">Home</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                {pathnames.map((value, index) => {
                                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                                    const isLast = index === pathnames.length - 1;
                                    return (
                                        <>
                                            <BreadcrumbSeparator />
                                            <BreadcrumbItem>
                                                {isLast ? (
                                                    <BreadcrumbPage>{value.charAt(0).toUpperCase() + value.slice(1)}</BreadcrumbPage>
                                                ) : (
                                                    <BreadcrumbLink asChild>
                                                        <Link to={to}>{value.charAt(0).toUpperCase() + value.slice(1)}</Link>
                                                    </BreadcrumbLink>
                                                )}
                                            </BreadcrumbItem>
                                        </>
                                    );
                                })}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="rounded-full">
                                <CircleUser className="h-5 w-5" />
                                <span className="sr-only">Toggle user menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Settings</DropdownMenuItem>
                            <DropdownMenuItem>Support</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { logout(); navigate('/login'); }}>Logout</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
} 