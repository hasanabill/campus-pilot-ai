import { checkRateLimit } from "@/lib/rateLimit";

type LimitOptions = {
  name: string;
  windowMs: number;
  maxRequests: number;
};

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function enforceRateLimit(request: Request, options: LimitOptions) {
  const ip = getClientIp(request);
  const key = `${options.name}:${ip}`;
  return checkRateLimit(key, {
    windowMs: options.windowMs,
    maxRequests: options.maxRequests,
  });
}

export function validateFileUpload(
  file: File,
  options: { maxBytes: number; allowedMimeTypes: string[] },
) {
  if (file.size > options.maxBytes) {
    throw new Error(`File exceeds maximum allowed size of ${Math.floor(options.maxBytes / 1024 / 1024)}MB.`);
  }
  if (!options.allowedMimeTypes.includes(file.type)) {
    throw new Error("Unsupported file type.");
  }
}
