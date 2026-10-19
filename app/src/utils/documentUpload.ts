export interface DocumentUpload { name: string; mimeType: string; base64: string }
export interface PickedDocument { name: string; mimeType?: string | null; size?: number }
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const types = ["image/jpeg", "image/png", "application/pdf"];

// Android document providers may return a generic MIME type. The server still
// verifies the actual file signature, MIME type and filename extension.
export async function prepareDocumentUpload(file: PickedDocument, read: () => Promise<string>): Promise<DocumentUpload> {
  if (!file.name?.trim()) throw new Error("The selected document needs a file name.");
  const extensionType = /\.pdf$/i.test(file.name) ? "application/pdf" : /\.png$/i.test(file.name) ? "image/png" : /\.jpe?g$/i.test(file.name) ? "image/jpeg" : "";
  const reportedType = file.mimeType?.toLowerCase();
  const mimeType = !reportedType || reportedType === "application/octet-stream" ? extensionType : reportedType === "image/jpg" ? "image/jpeg" : reportedType;
  if (!types.includes(mimeType) || mimeType !== extensionType) throw new Error("Select a JPEG, PNG or PDF file.");
  if (file.size != null && (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_DOCUMENT_BYTES)) throw new Error("Documents must be nonempty and 2 MB or smaller.");
  const base64 = await read();
  if (!base64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) throw new Error("Could not read the selected document.");
  const size = base64.length * 3 / 4 - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (size > MAX_DOCUMENT_BYTES) throw new Error("Documents must be 2 MB or smaller.");
  return { name: file.name, mimeType, base64 };
}
