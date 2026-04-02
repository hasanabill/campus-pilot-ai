import { UploadApiResponse } from "cloudinary";

import { getCloudinary } from "@/lib/cloudinary";

type UploadOptions = {
  folder: string;
  public_id?: string;
  resource_type?: "image" | "video" | "raw" | "auto";
  format?: string;
};

type UploadedFileMeta = {
  secure_url: string;
  public_id: string;
  bytes: number;
  format?: string;
  resource_type: string;
};

function bufferFromArrayBuffer(arrayBuffer: ArrayBuffer): Buffer {
  return Buffer.from(arrayBuffer);
}

export async function uploadBufferToCloudinary(
  data: Buffer,
  options: UploadOptions,
): Promise<UploadedFileMeta> {
  const cloudinary = getCloudinary();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.public_id,
        resource_type: options.resource_type ?? "raw",
        format: options.format,
        overwrite: true,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }
        resolve(uploadResult);
      },
    );

    stream.end(data);
  });

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    bytes: result.bytes,
    format: result.format,
    resource_type: result.resource_type,
  };
}

export async function uploadFormFileToCloudinary(
  file: File,
  options: UploadOptions,
): Promise<UploadedFileMeta> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = bufferFromArrayBuffer(arrayBuffer);
  return uploadBufferToCloudinary(buffer, options);
}
