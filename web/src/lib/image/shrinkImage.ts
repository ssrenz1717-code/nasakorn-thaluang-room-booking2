/**
 * ย่อรูปที่ผู้ดูแลเลือกให้เป็น JPEG ที่เก็บในเซลล์เดียวของ Google Sheets ได้
 * เริ่มที่ความกว้าง 960px แล้วลดคุณภาพ/ขนาดลงจนกว่าจะไม่เกิน maxChars
 * — ไม่ต้องอัปโหลดขึ้น Drive จึงไม่ต้องขอสิทธิ์เพิ่มหรือแชร์ไฟล์
 */
export async function shrinkImage(file: File, maxChars: number): Promise<string> {
  if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.type) && file.type !== '') {
    throw new Error('เลือกได้เฉพาะไฟล์รูปภาพ');
  }
  const bitmap = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('เบราว์เซอร์นี้ย่อรูปไม่ได้ ลองใช้ลิงก์รูปแทน');

  for (const width of [960, 800, 640, 480, 360]) {
    const scale = Math.min(1, width / bitmap.width);
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.68, 0.55]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= maxChars) return dataUrl;
    }
  }
  throw new Error('รูปนี้ย่อให้เล็กพอไม่ได้ ลองเลือกรูปอื่น');
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('เปิดไฟล์รูปนี้ไม่ได้ ลองเลือกเป็น JPG หรือ PNG')); };
    image.src = url;
  });
}
