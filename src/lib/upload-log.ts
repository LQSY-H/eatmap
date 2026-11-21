import { readJsonFile, writeJsonFile } from "@/lib/io";

export type UploadLogEntry = {
  path: string;
  userId: string;
  shopId?: string;
  kind: string;
  createdAt: string;
};

export async function appendUploadLog(entry: UploadLogEntry): Promise<void> {
  let rows: UploadLogEntry[] = [];
  try {
    rows = await readJsonFile<UploadLogEntry[]>("upload-meta.json");
    if (!Array.isArray(rows)) rows = [];
  } catch {
    rows = [];
  }
  rows.push(entry);
  await writeJsonFile("upload-meta.json", rows);
}
