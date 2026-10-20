export function cldUrl(url: string, width: number) {
  return /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url) ? url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${Math.round(width)}/`) : url;
}

export function resizeImageFile(file: File, maxWidth = 2400): Promise<File> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Vui lòng chọn tệp ảnh.'));
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(objectUrl);
        blob ? resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })) : reject(new Error('Không thể xử lý ảnh.'));
      }, 'image/jpeg', .85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc ảnh.'));
    };
    img.src = objectUrl;
  });
}

export async function uploadImage(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error('Chưa cấu hình Cloudinary.');
  const resized = await resizeImageFile(file);
  const form = new FormData();
  form.append('file', resized);
  form.append('upload_preset', preset);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round(e.loaded / e.total * 100));
    };
    xhr.onerror = () => reject(new Error('Không thể tải ảnh lên.'));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve(data.secure_url); else reject(new Error(data.error?.message || 'Tải ảnh thất bại.'));
      } catch {
        reject(new Error('Phản hồi tải ảnh không hợp lệ.'));
      }
    };
    xhr.send(form);
  });
}
