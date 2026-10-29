import { useState } from 'react';
import { Link2, Check, Send } from 'lucide-react';

interface ShareButtonsProps {
  url: string;
  title: string;
  tone?: 'light' | 'dark';
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.66 15l-1.3 4.76 4.88-1.28A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-2.9.76.78-2.83-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.14c-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06a6.7 6.7 0 0 1-1.97-1.22 7.4 7.4 0 0 1-1.37-1.7c-.14-.25 0-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42h-.48a.92.92 0 0 0-.67.31 2.8 2.8 0 0 0-.87 2.08 4.87 4.87 0 0 0 1.02 2.59 11.1 11.1 0 0 0 4.27 3.77c.6.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.17-.48-.29Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z" />
    </svg>
  );
}

export function ShareButtons({ url, title, tone = 'light' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  const handleCopy = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // User cancelled the share sheet or clipboard is unavailable.
    }
  };

  const base = tone === 'dark'
    ? 'bg-white/15 text-white hover:bg-white/25'
    : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600';
  const button = `inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${base}`;

  return (
    <div className="flex items-center gap-1.5" aria-label="Share this story">
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={button} aria-label="Share on WhatsApp" title="Share on WhatsApp">
        <WhatsAppIcon className="w-4 h-4" />
      </a>
      <a href={xUrl} target="_blank" rel="noopener noreferrer" className={button} aria-label="Share on X" title="Share on X">
        <XIcon className="w-3.5 h-3.5" />
      </a>
      <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={button} aria-label="Share on Telegram" title="Share on Telegram">
        <Send className="w-3.5 h-3.5" />
      </a>
      <button type="button" onClick={handleCopy} className={button} aria-label={copied ? 'Link copied' : 'Copy link'} title={copied ? 'Link copied' : 'Copy link'}>
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
