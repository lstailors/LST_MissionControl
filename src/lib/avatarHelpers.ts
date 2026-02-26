import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════
// Avatar Helpers — Upload, fetch, and delete avatars from
// Supabase Storage "avatars" bucket.
//
// NOTE: Create "avatars" bucket in Supabase Dashboard -> Storage -> New Bucket
// Set to public bucket so avatar URLs are accessible without auth tokens.
// ═══════════════════════════════════════════════════════════

type AvatarType = 'agent' | 'employee' | 'user';

/**
 * Build the storage path for an avatar.
 * agents/maestro.png, employees/abc123.png, users/uid.png
 */
function storagePath(type: AvatarType, id: string): string {
  const folder = type === 'agent' ? 'agents' : type === 'employee' ? 'employees' : 'users';
  return `${folder}/${id}.png`;
}

/**
 * Get the public URL for an avatar.
 * Returns null if no id provided.
 */
export function getAvatarUrl(type: AvatarType, id: string): string | null {
  if (!id) return null;
  const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath(type, id));
  return data?.publicUrl ?? null;
}

/**
 * Upload an avatar file to Supabase Storage.
 * The file is converted to PNG via canvas for uniform sizing (256x256).
 * Returns the new public URL on success.
 */
export async function uploadAvatar(
  type: AvatarType,
  id: string,
  file: File,
): Promise<string> {
  // Resize to 256x256 square PNG via canvas
  const resized = await resizeToSquare(file, 256);
  const path = storagePath(type, id);

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, resized, { upsert: true, contentType: 'image/png' });

  if (error) throw new Error(error.message);

  // Cache-bust: append timestamp
  const url = getAvatarUrl(type, id);
  return url ? `${url}?t=${Date.now()}` : '';
}

/**
 * Delete an avatar from Supabase Storage.
 */
export async function deleteAvatar(type: AvatarType, id: string): Promise<void> {
  const { error } = await supabase.storage
    .from('avatars')
    .remove([storagePath(type, id)]);
  if (error) throw new Error(error.message);
}

// ── Internal: resize image to square PNG blob ──
function resizeToSquare(file: File, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Center-crop to square
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/png',
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
