import { useEffect, useState } from 'react';
import { Wind } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  priority?: boolean;
}

function isSafeImageSrc(src: string): boolean {
  const trimmed = src.trim();
  return (
    trimmed.startsWith('/src/assets/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/')
  );
}

export function SafeImage({
  src,
  alt,
  className = 'h-full w-full object-cover',
  fallbackTitle = 'AIRWISE Environmental View',
  priority = false,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !isSafeImageSrc(src)) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#102A43] via-[#1B4366] to-[#20C997]/40 p-6 text-center text-white"
        role="img"
        aria-label={alt}
      >
        <Wind className="mb-2 h-8 w-8 text-[#38BDF8]" aria-hidden="true" />
        <p className="text-sm font-medium text-white/95">{fallbackTitle}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
