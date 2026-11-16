import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackTitle,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#081626] text-slate-300 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="h-8 w-8 text-slate-400 mb-1.5" />
        {fallbackTitle && (
          <span className="text-xs font-medium text-slate-300 line-clamp-1 max-w-[180px]">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
};
