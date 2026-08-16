import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const configured =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

export function cloudinaryEnabled(): boolean {
  return configured;
}

export function uploadBuffer(buffer: Buffer, folder: string, publicId?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "auto" },
      (error, result) => {
        if (error || !result) return reject(error || new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export function publicIdFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  const segments = pathname.split("/");
  const versionIndex = segments.findIndex((s) => s.startsWith("v") && /^\d+$/.test(s.slice(1)));
  const start = versionIndex >= 0 ? versionIndex + 1 : segments.length - 1;
  const idWithExt = segments.slice(start).join("/");
  return idWithExt.replace(/\.[a-zA-Z0-9]+$/, "");
}

export function destroyAsset(url: string): Promise<void> {
  return new Promise((resolve) => {
    cloudinary.uploader.destroy(publicIdFromUrl(url), () => resolve());
  });
}

export default cloudinary;
