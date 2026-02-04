import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";
import fs from "fs";
import path from "path";

const { bucketName, folderPrefix } = getBucketConfig();

const isLocal = !process.env.AWS_ACCESS_KEY_ID;

const s3Client = isLocal ? null : createS3Client();

export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = true
): Promise<{ uploadUrl: string; cloud_storage_path: string }> {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  if (isLocal) {
    const cloud_storage_path = `${timestamp}-${safeName}`;
    const uploadUrl = `/api/upload/local?filename=${cloud_storage_path}`;
    return { uploadUrl, cloud_storage_path };
  }

  if (!s3Client) throw new Error("S3 Client not initialized");

  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${timestamp}-${safeName}`
    : `${folderPrefix}uploads/${timestamp}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
    ContentDisposition: isPublic ? "inline" : undefined
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { uploadUrl, cloud_storage_path };
}

export function getFileUrl(cloud_storage_path: string, isPublic: boolean = true): string {
  if (isLocal) {
    return `/uploads/${cloud_storage_path}`;
  }

  if (isPublic) {
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }
  return cloud_storage_path;
}

export async function deleteFile(cloud_storage_path: string): Promise<void> {
  if (isLocal) {
    const filePath = path.join(process.cwd(), "public", "uploads", cloud_storage_path);
    if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
    }
    return;
  }

  if (!s3Client) throw new Error("S3 Client not initialized");

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path
  });
  await s3Client.send(command);
}
