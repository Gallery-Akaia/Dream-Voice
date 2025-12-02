import { Client } from "@replit/object-storage";
import path from "path";
import fs from "fs/promises";

let storageClient: Client | null = null;
let useLocalStorage = false;

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
  }
}

export function getStorageClient(): Client | null {
  if (useLocalStorage) return null;
  
  if (!storageClient) {
    try {
      storageClient = new Client();
    } catch (error) {
      console.log("Object storage not available, using local file storage");
      useLocalStorage = true;
      return null;
    }
  }
  return storageClient;
}

export async function uploadToStorage(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getStorageClient();
  
  if (client) {
    try {
      await client.uploadFromBytes(key, buffer);
      return key;
    } catch (error: any) {
      if (error?.message?.includes("bucket name")) {
        console.log("Object storage not configured, falling back to local storage");
        useLocalStorage = true;
      } else {
        throw error;
      }
    }
  }
  
  await ensureUploadsDir();
  const filename = key.replace(/^audio\//, "");
  const filePath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return key;
}

export async function deleteFromStorage(key: string): Promise<void> {
  const client = getStorageClient();
  
  if (client && !useLocalStorage) {
    try {
      await client.delete(key);
      return;
    } catch (error) {
      console.error("Failed to delete from object storage:", error);
    }
  }
  
  try {
    const filename = key.replace(/^audio\//, "");
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.unlink(filePath);
  } catch (error) {
    console.error("Failed to delete from local storage:", error);
  }
}

export async function downloadFromStorage(key: string): Promise<Buffer | null> {
  const client = getStorageClient();
  
  if (client && !useLocalStorage) {
    try {
      const result = await client.downloadAsBytes(key);
      if (result.ok) {
        return Buffer.from(result.value);
      }
    } catch (error: any) {
      if (error?.message?.includes("bucket name")) {
        useLocalStorage = true;
      } else {
        console.error("Failed to download from object storage:", error);
      }
    }
  }
  
  try {
    const filename = key.replace(/^audio\//, "");
    const filePath = path.join(UPLOADS_DIR, filename);
    const buffer = await fs.readFile(filePath);
    return buffer;
  } catch (error) {
    console.error("Failed to download from local storage:", error);
    return null;
  }
}

export function getStorageUrl(key: string): string {
  return `/api/audio/${encodeURIComponent(key)}`;
}
