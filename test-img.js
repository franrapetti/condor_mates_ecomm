const rawUrl = 'https://something.supabase.co/storage/v1/object/public/bucket/image.png';
let transformedUrl = rawUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
const params = ['width=800', 'quality=70', 'resize=contain', 'format=webp'];
const separator = transformedUrl.includes('?') ? '&' : '?';
console.log(`${transformedUrl}${separator}${params.join('&')}`);
