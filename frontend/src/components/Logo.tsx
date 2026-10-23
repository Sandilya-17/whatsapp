import React from 'react';

/** ConnectNow mark: two linked speech bubbles forming a spark. Original artwork. */
export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 44, className }) => {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="19" fill="#00a884" />
      <path
        d="M20 17h17a9 9 0 0 1 9 9v6a9 9 0 0 1-9 9h-7l-7 6v-6a9 9 0 0 1-3-6.7V26a9 9 0 0 1 0-9Z"
        fill="#fff"
        fillOpacity=".95"
      />
      <circle cx="43.5" cy="42.5" r="8.5" fill="#0b141a" />
      <path d="M40 42.5h7M43.5 39v7" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
};
