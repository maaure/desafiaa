import { randomUUID } from "node:crypto";
import path from "node:path";
import type { MultipartFile } from "@fastify/multipart";
import { AppError } from "../../shared/errors";
import { uploadRepo } from "./upload.repository";
import type { UploadResponse } from "./upload.types";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const uploadService = {
  async upload(file: MultipartFile): Promise<UploadResponse> {
    // Valida tipo
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new AppError(
        `Tipo de arquivo não permitido. Use: JPEG, PNG ou WebP.`,
        400,
        "INVALID_FILE_TYPE",
      );
    }

    // Valida tamanho lendo o buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
      const totalSize = chunks.reduce((s, c) => s + c.length, 0);
      if (totalSize > MAX_SIZE_BYTES) {
        throw new AppError(
          `Arquivo muito grande. Máximo: ${MAX_SIZE_MB}MB.`,
          400,
          "FILE_TOO_LARGE",
        );
      }
    }

    // Gera nome único e salva
    const ext = EXTENSIONS[file.mimetype] ?? ".bin";
    const filename = `${randomUUID()}${ext}`;

    // Como lemos o buffer para validar tamanho, escrevemos direto
    const { writeFile, mkdir } = await import("node:fs/promises");
    const UPLOAD_DIR = uploadRepo.UPLOAD_DIR;
    await mkdir(UPLOAD_DIR, { recursive: true });

    const buffer = Buffer.concat(chunks);
    const filepath = path.join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);

    return { url: `/uploads/${filename}` };
  },
};
