import { Client } from "@replit/object-storage";

let storageClient: Client | null = null;

export function getStorageClient(): Client {
  if (!storageClient) {
    storageClient = new Client();
  }
  return storageClient;
}

export async function uploadToStorage(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getStorageClient();
  await client.uploadFromBytes(key, buffer);
  return key;
}

export async function deleteFromStorage(key: string): Promise<void> {
  const client = getStorageClient();
  try {
    await client.delete(key);
  } catch (error) {
    console.error("Failed to delete from storage:", error);
  }
}

export async function downloadFromStorage(key: string): Promise<Buffer | null> {
  const client = getStorageClient();
  try {
    const result = await client.downloadAsBytes(key);
    if (result.ok) {
      return Buffer.from(result.value);
    }
    return null;
  } catch (error) {
    console.error("Failed to download from storage:", error);
    return null;
  }
}

export function getStorageUrl(key: string): string {
  return `/api/audio/${encodeURIComponent(key)}`;
}
