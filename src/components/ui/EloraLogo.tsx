import React from 'react';

interface EloraLogoProps {
  size?: number;
  className?: string;
}

/**
 * Emblème géométrique original d'ELORA :
 * cadre adouci abritant un prisme étoile-boussole et un feuillet ouvert.
 */
export const EloraLogo: React.FC<EloraLogoProps> = ({ size = 20, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Feuillet / socle architectural */}
      <path
        d="M6 21.5C9.5 19.8 12.8 19.8 16 21.5C19.2 19.8 22.5 19.8 26 21.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 21.5V26"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* Étoile-boussole à 4 branches (clarté & orientation) */}
      <path
        d="M16 5.5L18.2 11.8L24.5 14L18.2 16.2L16 20.5L13.8 16.2L7.5 14L13.8 11.8L16 5.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="14" r="1.4" fill="currentColor" />
    </svg>
  );
};
