import { useRef, useState } from 'react';
import { Loader2, Camera } from 'lucide-react';
import { Avatar } from './Avatar';
import { uploadAvatar } from '@/lib/avatarHelpers';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════
// AvatarUpload — Clickable avatar with file upload capability
// ═══════════════════════════════════════════════════════════

interface AvatarUploadProps {
  type: 'agent' | 'employee' | 'user';
  id: string;
  src?: string | null;
  name?: string;
  size?: number;
  accentColor?: string;
  onUploaded?: (newUrl: string) => void;
}

export function AvatarUpload({
  type,
  id,
  src,
  name,
  size = 48,
  accentColor,
  onUploaded,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localSrc, setLocalSrc] = useState<string | null>(null);

  const displaySrc = localSrc || src;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setUploading(true);
    try {
      const newUrl = await uploadAvatar(type, id, file);
      setLocalSrc(newUrl);
      onUploaded?.(newUrl);
    } catch (err) {
      console.error('[AvatarUpload] Upload failed:', err);
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div
      className="relative group cursor-pointer"
      style={{ width: size, height: size }}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <Avatar src={displaySrc} name={name} size={size} accentColor={accentColor} />

      {/* Upload overlay on hover */}
      <div className={clsx(
        'absolute inset-0 rounded-full flex items-center justify-center transition-opacity',
        'bg-black/40',
        uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      )}>
        {uploading ? (
          <Loader2 size={size * 0.35} className="animate-spin text-white" />
        ) : (
          <Camera size={size * 0.3} className="text-white/80" />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
