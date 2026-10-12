import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { RequestHandler } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth.middleware";
import { HttpError } from "../middleware/error.middleware";

export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const root = () => path.resolve(process.env.PRIVATE_DOCUMENT_DIR || "private-documents");
const marker = /worknest-file:([0-9a-f-]{36})/g;
export function documentIds(value: string): string[] {
  return [...value.matchAll(marker)].map(match => match[1]);
}

export function validateDocument(input: unknown) {
  const file = input as { name?: unknown; mimeType?: unknown; base64?: unknown };
  if (!file || typeof file.name !== "string" || typeof file.base64 !== "string") throw new HttpError(400, "Invalid document.");
  if (file.base64.length > Math.ceil(MAX_DOCUMENT_BYTES / 3) * 4) throw new HttpError(413, "Documents must be 2 MB or smaller.");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.base64)) throw new HttpError(400, "Invalid file encoding.");
  const bytes = Buffer.from(file.base64, "base64");
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) throw new HttpError(413, "Documents must be nonempty and 2 MB or smaller.");
  const type = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg"
    : bytes.subarray(0, 5).toString() === "%PDF-" && bytes.subarray(-1024).includes(Buffer.from("%%EOF")) ? "application/pdf" : undefined;
  const extension = type === "image/png" ? /\.png$/i : type === "image/jpeg" ? /\.jpe?g$/i : /\.pdf$/i;
  if (!type || file.mimeType !== type || !extension.test(file.name)) throw new HttpError(400, "Select a valid JPEG, PNG or PDF document.");
  return { bytes, type, name: file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(-120) };
}

// Authorization follows the current database association, never possession of a reference.
export async function canReadDocument(id: string, userId: string, role: string, ownerOnly = false) {
  const reference = `worknest-file:${id}`;
  const application = await prisma.verifierApplication.findFirst({ where: { identityDocumentReference: { contains: reference }, ...(role === "admin" && !ownerOnly ? {} : { applicantId: userId }) }, select: { id: true } });
  if (application) return true;
  const reactivation = await prisma.verifierReactivationRequest.findFirst({ where: { attachmentReference: { contains: reference }, ...(role === "admin" && !ownerOnly ? {} : { verifierId: userId }) }, select: { id: true } });
  if (reactivation) return true;
  const request = await prisma.verificationRequest.findFirst({ where: { AND: [ { OR: [{ identityDocument: { contains: reference } }, { supportingEvidence: { contains: reference } }] }, role === "admin" && !ownerOnly ? {} : { OR: [{ applicantId: userId }, ...(!ownerOnly && role === "verifier" ? [{ assignedVerifierId: userId }] : [])] } ] }, select: { applicantId: true } });
  if (!request) return false;
  if (role !== "verifier" || request.applicantId === userId || ownerOnly) return true;
  return !!await prisma.verifierApplication.findFirst({ where: { applicantId: userId, status: "APPROVED" }, select: { id: true } });
}

export function receiveDocuments(fields: string[], registration = false): RequestHandler {
  return async (req, res, next) => {
    const created: string[] = [];
    const cleanup = () => Promise.all(created.map(id => unlink(path.join(root(), id)).catch(() => undefined)));
    res.once("finish", () => {
      if (res.statusCode < 400) return;
      // A controller may fail while reading back an already committed record.
      // Keep files if they are associated, or if the database cannot confirm absence.
      void Promise.all(created.map(async id => {
        try {
          if (!await canReadDocument(id, "", "admin")) await unlink(path.join(root(), id));
        } catch { /* Retain for reconciliation after a database/storage outage. */ }
      }));
    });
    try {
      for (const field of fields) {
        const value = req.body[field];
        if (typeof value === "string") {
          for (const id of documentIds(value)) {
            const auth = req as AuthedRequest;
            if (registration || !await canReadDocument(id, auth.userId, auth.userRole, true)) throw new HttpError(403, "You cannot attach this document.");
          }
        }
      }
      // Validate all files before writing any of them.
      const files = fields.filter(field => req.body[`${field}Upload`] != null).map(field => ({ field, file: validateDocument(req.body[`${field}Upload`]) }));
      if (registration && files.length && req.body.role !== "verifier") throw new HttpError(400, "Documents are only supported for verifier registration.");
      for (const { field, file } of files) {
        const id = randomUUID();
        await mkdir(root(), { recursive: true, mode: 0o700 });
        await writeFile(path.join(root(), id), JSON.stringify({ name: file.name, type: file.type, base64: file.bytes.toString("base64") }), { flag: "wx", mode: 0o600 });
        created.push(id);
        const text = typeof req.body[field] === "string" ? req.body[field].replace(marker, "").trim() : "";
        req.body[field] = [text, `worknest-file:${id}`].filter(Boolean).join("\n");
        delete req.body[`${field}Upload`];
      }
      next();
    } catch (error) { await cleanup(); next(error); }
  };
}

export const downloadDocument: RequestHandler = async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new HttpError(404, "Document not found.");
    const { userId, userRole } = req as AuthedRequest;
    if (!await canReadDocument(id, userId, userRole)) throw new HttpError(404, "Document not found.");
    const file = JSON.parse(await readFile(path.join(root(), id), "utf8"));
    res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox", "Content-Disposition": `attachment; filename="${file.name}"`, "Content-Type": file.type });
    res.send(Buffer.from(file.base64, "base64"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return next(new HttpError(404, "Document not found."));
    next(error);
  }
};
