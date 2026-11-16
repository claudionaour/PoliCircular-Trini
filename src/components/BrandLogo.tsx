import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  lightText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', lightText = true }) => {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={`${dim} shrink-0`}
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="16" fill="#FFFFFF" />
        <path
          d="M32 12C20.954 12 12 20.954 12 32C12 35.8 13.06 39.35 14.9 42.38"
          stroke="#102C49"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <path
          d="M11.5 38.2L15.1 43L19.9 39.4"
          stroke="#102C49"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32 52C43.046 52 52 43.046 52 32C52 28.2 50.94 24.65 49.1 21.62"
          stroke="#F28C28"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <path
          d="M52.5 25.8L48.9 21L44.1 24.6"
          stroke="#F28C28"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M32 43V27" stroke="#102C49" strokeWidth="3" strokeLinecap="round" />
        <path d="M32 33.5C32 27.6 36.8 23.2 42.8 23.2C42.8 29.1 38 33.5 32 33.5Z" fill="#1E7E48" />
        <path d="M32 36.8C32 31.6 28 27.8 22.8 27.8C22.8 33 26.8 36.8 32 36.8Z" fill="#F28C28" />
      </svg>
      <span
        className={`font-display font-bold tracking-tight ${textSize} ${
          lightText ? 'text-white' : 'text-[#102C49]'
        }`}
      >
        Poli<span className="text-[#FFA94D]">Circular</span>
      </span>
    </span>
  );
};
