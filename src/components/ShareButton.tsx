import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Copy, 
  Link as LinkIcon,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
  post: {
    title: string;
    excerpt?: string;
    slug: string;
    image?: string;
  };
  className?: string;
  variant?: 'default' | 'compact';
}

const ShareButton = ({ post, className, variant = 'default' }: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Generate the blog URL (you may need to adjust this based on your frontend URL structure)
  const getBlogUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/blog/${post.slug}`;
  };

  const handleShare = async (platform: string) => {
    const url = getBlogUrl();
    const text = post.title;
    const description = post.excerpt || '';

    try {
      switch (platform) {
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'email':
          const subject = encodeURIComponent(`Check out this blog post: ${text}`);
          const body = encodeURIComponent(`${text}\n\n${description}\n\nRead more: ${url}`);
          window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
          break;
        case 'copy-url':
          await navigator.clipboard.writeText(url);
          toast.success('Blog URL copied to clipboard!');
          break;
        case 'copy-content':
          const shareText = `${text}\n\n${description}\n\nRead more: ${url}`;
          await navigator.clipboard.writeText(shareText);
          toast.success('Blog content copied to clipboard!');
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share. Please try again.');
    }
    
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size={variant === 'compact' ? 'sm' : 'sm'}
          className={`flex items-center gap-2 bg-white/90 backdrop-blur-sm hover:bg-white ${className}`}
        >
          <Share2 className="w-4 h-4" />
          {variant === 'compact' ? '' : 'Share'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleShare('facebook')}>
          <Facebook className="w-4 h-4 mr-2 text-blue-600" />
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('twitter')}>
          <Twitter className="w-4 h-4 mr-2 text-blue-400" />
          Share on Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('linkedin')}>
          <Linkedin className="w-4 h-4 mr-2 text-blue-700" />
          Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('email')}>
          <Mail className="w-4 h-4 mr-2 text-gray-600" />
          Share via Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('copy-url')}>
          <LinkIcon className="w-4 h-4 mr-2 text-green-600" />
          Copy URL
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('copy-content')}>
          <Copy className="w-4 h-4 mr-2 text-purple-600" />
          Copy Content
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareButton; 