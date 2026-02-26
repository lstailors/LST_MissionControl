import { useState } from 'react';
import { User } from 'lucide-react';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// Avatar — Display-only circular avatar with initials fallback
// ═══════════════════════════════════════════════════════════

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  accentColor?: string;
  className?: string;
}

export function Avatar({ src, name, size = 36, accentColor = '#4B8C50', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '';

  const showImage = src && !imgError;

  return (
    <div
      className={clsx(
        'relative rounded-full shrink-0 overflow-hidden',
        'border border-[rgb(var(--aegis-overlay)/0.12)]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name || 'avatar'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : initials ? (
        <div
          className="w-full h-full flex items-center justify-center font-bold"
          style={{
            background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
            color: accentColor,
            fontSize: size * 0.38,
          }}
        >
          {initials}
        </div>
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`,
            color: accentColor,
          }}
        >
          <User size={size * 0.45} />
        </div>
      )}
    </div>
  );
}
