import { v2 as cloudinary } from "cloudinary";

let configured = false;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to your environment variables.`);
  }
  return value;
}

export function getCloudinary() {
  if (!configured) {
    cloudinary.config({
      cloud_name: requireEnv("CLOUDINARY_CLOUD_NAME"),
      api_key: requireEnv("CLOUDINARY_API_KEY"),
      api_secret: requireEnv("CLOUDINARY_API_SECRET"),
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}
