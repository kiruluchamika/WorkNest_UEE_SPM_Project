import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Button } from "./Button";
import { http, extractErrorMessage } from "../../api/http";

export interface DocumentUpload { name: string; mimeType: string; base64: string }
const MAX_BYTES = 2 * 1024 * 1024;
const types = ["image/jpeg", "image/png", "application/pdf"];

export function DocumentField({ label, value, onChange, existing, onRemoveExisting, disabled = false, required = false }: {
  label: string; value?: DocumentUpload; onChange: (file?: DocumentUpload) => void;
  existing?: string; onRemoveExisting?: () => void; disabled?: boolean; required?: boolean;
}) {
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const select = async () => {
    setError(""); setPicking(true);
    let cachedUri: string | undefined;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: types, multiple: false, copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      if (Platform.OS !== "web") cachedUri = file.uri;
      const mimeType = file.mimeType || (/\.pdf$/i.test(file.name) ? "application/pdf" : /\.png$/i.test(file.name) ? "image/png" : /\.jpe?g$/i.test(file.name) ? "image/jpeg" : "");
      if (!types.includes(mimeType)) throw new Error("Select a JPEG, PNG or PDF file.");
      if (file.size != null && file.size > MAX_BYTES) throw new Error("Documents must be 2 MB or smaller.");
      let base64: string;
      try {
        if (Platform.OS === "web") {
          const blob = file.file || await (await fetch(file.uri)).blob();
          if (blob.size > MAX_BYTES) throw new Error("Documents must be 2 MB or smaller.");
          base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.readAsDataURL(blob); });
        } else base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      } finally {
        if (Platform.OS !== "web") await FileSystem.deleteAsync(file.uri, { idempotent: true }).catch(() => undefined);
      }
      if (base64.length * 3 / 4 - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0) > MAX_BYTES) throw new Error("Documents must be 2 MB or smaller.");
      onChange({ name: file.name, mimeType, base64 });
      onRemoveExisting?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read the selected document."); }
    finally {
      if (cachedUri) await FileSystem.deleteAsync(cachedUri, { idempotent: true }).catch(() => undefined);
      setPicking(false);
    }
  };
  return <View style={{ marginVertical: 10 }}><Text>{label} ({required ? "required" : "optional"})</Text><Text>JPEG, PNG or PDF · Maximum 2 MB</Text>
    {value ? <Text>Selected: {value.name}</Text> : existing ? <DocumentEvidence label="Previous document" value={existing}/> : null}
    <Button title={value || existing ? "Replace document" : "Select document"} variant="outline" onPress={select} disabled={disabled || picking}/>
    {value || existing ? <Button title="Remove document" variant="outline" disabled={disabled || picking} onPress={() => { onChange(undefined); onRemoveExisting?.(); setError(""); }}/> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: "#b42318" }}>{error}</Text> : null}
  </View>;
}

export function DocumentEvidence({ label, value }: { label: string; value?: string }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const ids = [...(value || "").matchAll(/worknest-file:([0-9a-f-]{36})/g)].map(match => match[1]);
  const text = (value || "").replace(/worknest-file:[0-9a-f-]{36}/g, "").trim();
  const open = async (id: string) => {
    setError(""); setBusy(true);
    try {
      if (Platform.OS === "web") {
        const response = await http.get(`/private-documents/${id}`, { responseType: "blob" });
        const url = URL.createObjectURL(response.data);
        const a = document.createElement("a"); a.href = url; a.download = /filename="([^"]+)"/.exec(response.headers["content-disposition"] || "")?.[1] || "document"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        if (!await Sharing.isAvailableAsync()) throw new Error("Document opening is unavailable on this device.");
        const uri = `${FileSystem.cacheDirectory}evidence-${id}`;
        let displayUri = uri;
        try {
          const result = await FileSystem.downloadAsync(`${http.defaults.baseURL}/private-documents/${id}`, uri, { headers: { Authorization: String(http.defaults.headers.common.Authorization || "") } });
          if (result.status !== 200) throw new Error("Document is unavailable or access was denied.");
          const extension = result.mimeType === "application/pdf" ? ".pdf" : result.mimeType === "image/png" ? ".png" : ".jpg";
          displayUri = uri + extension;
          await FileSystem.moveAsync({ from: uri, to: displayUri });
          await Sharing.shareAsync(displayUri, { mimeType: result.mimeType || undefined });
        } finally {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          if (displayUri !== uri) await FileSystem.deleteAsync(displayUri, { idempotent: true });
        }
      }
    } catch (e) { setError(extractErrorMessage(e, e instanceof Error ? e.message : "Could not open document.")); }
    finally { setBusy(false); }
  };
  return <View style={{ marginVertical: 8 }}><Text>{label}</Text>{text ? <Text>{text}</Text> : null}{!value ? <Text>Not provided</Text> : null}
    {ids.map(id => <Button key={id} title="Open attached document" variant="outline" disabled={busy} onPress={() => open(id)}/>)}
    {value && !ids.length ? <Text>Legacy text only — no uploaded file.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: "#b42318" }}>{error}</Text> : null}
  </View>;
}
