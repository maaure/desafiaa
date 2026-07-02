import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { MultipartFile } from "@fastify/multipart";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");

async function ensureUploadDir(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export const uploadRepo = {
  UPLOAD_DIR,

  async saveToDisk(file: MultipartFile, filename: string): Promise<string> {
    await ensureUploadDir();

    const filepath = path.join(UPLOAD_DIR, filename);
    await pipeline(file.file, createWriteStream(filepath));

    return `/uploads/${filename}`;
  },

  async deleteFromDisk(url: string): Promise<void> {
    const filename = url.replace(/^\/uploads\//, "");
    if (!filename || filename.includes("..")) return;

    const filepath = path.join(UPLOAD_DIR, filename);
    try {
      await unlink(filepath);
    } catch {
      // Arquivo já não existe — ok
    }
  },
};
