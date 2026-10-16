import React, { useState } from "react";
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Button } from "./Button";
import { http, extractErrorMessage } from "../../api/http";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

import { prepareDocumentUpload, MAX_DOCUMENT_BYTES, type DocumentUpload } from "../../utils/documentUpload";
export type { DocumentUpload } from "../../utils/documentUpload";
const types = ["image/jpeg", "image/png", "application/pdf"];

export function DocumentField({ label, labelStyle, value, onChange, existing, onRemoveExisting, disabled = false, required = false, showOptionalLabel = true }: {
  label: string; labelStyle?: StyleProp<TextStyle>; value?: DocumentUpload; onChange: (file?: DocumentUpload) => void;
  existing?: string; onRemoveExisting?: () => void; disabled?: boolean; required?: boolean; showOptionalLabel?: boolean;
}) {
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const select = async () => {
    setError(""); setPicking(true);
    let cachedUri: string | undefined;
    try {
      // Android Expo Go may copy into the host cache outside this project's
      // filesystem scope. Read the picker-granted content URI instead.
      const copyToCacheDirectory = Platform.OS !== "android";
      const result = await DocumentPicker.getDocumentAsync({ type: types, multiple: false, copyToCacheDirectory });
      if (result.canceled) return;
      const file = result.assets[0];
      // Only delete a copy we requested, never the Android provider's source.
      if (Platform.OS !== "web" && copyToCacheDirectory) cachedUri = file.uri;
      const upload = await prepareDocumentUpload(file, async () => {
        if (Platform.OS === "web") {
          const blob = file.file || await (await fetch(file.uri)).blob();
          if (blob.size > MAX_DOCUMENT_BYTES) throw new Error("Documents must be 2 MB or smaller.");
          return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.readAsDataURL(blob); });
        }
        return new File(file.uri).base64();
      });
      onChange(upload);
      onRemoveExisting?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read the selected document."); }
    finally {
      if (cachedUri) await FileSystem.deleteAsync(cachedUri, { idempotent: true }).catch(() => undefined);
      setPicking(false);
    }
  };
  return <View style={documentStyles.panel}><Text style={[documentStyles.label, labelStyle]}>{label}{required ? " (required)" : showOptionalLabel ? " (optional)" : ""}</Text><Text style={documentStyles.help}>JPEG, PNG or PDF · Maximum 2 MB</Text>
    {value ? <Text style={documentStyles.selected}>Selected: {value.name}</Text> : existing ? <DocumentEvidence label="Previous document" value={existing}/> : null}
    <Button style={documentStyles.button} textStyle={documentStyles.buttonText} title={value || existing ? "Replace document" : "Select document"} variant="outline" onPress={select} disabled={disabled || picking}/>
    {value || existing ? <Button style={documentStyles.button} textStyle={documentStyles.buttonText} title="Remove document" variant="outline" disabled={disabled || picking} onPress={() => { onChange(undefined); onRemoveExisting?.(); setError(""); }}/> : null}
    {error ? <Text accessibilityRole="alert" style={documentStyles.error}>{error}</Text> : null}
  </View>;
}

export function DocumentEvidence({ label, value, highlightText = false }: { label: string; value?: string; highlightText?: boolean }) {
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
  return <View style={[documentStyles.panel, highlightText && documentStyles.highlightPanel]}><Text style={[documentStyles.label, highlightText && documentStyles.identityLabel]}>{label}</Text>{text ? <Text style={[documentStyles.help, highlightText && documentStyles.identityValue]}>{text}</Text> : null}{!value ? <Text style={documentStyles.help}>Not provided</Text> : null}
    {ids.map(id => <Button style={documentStyles.button} textStyle={documentStyles.buttonText} key={id} title="Open attached document" variant="outline" disabled={busy} onPress={() => open(id)}/>)}
    {value && !ids.length ? <Text style={documentStyles.help}>Legacy text only — no uploaded file.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={documentStyles.error}>{error}</Text> : null}
  </View>;
}

const documentStyles = StyleSheet.create({
  panel: { marginVertical: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surfaceSubtle },
  label: { fontSize: 13, lineHeight: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  help: { fontSize: 13, lineHeight: 20, color: colors.textMuted },
  highlightPanel: { backgroundColor: colors.primaryLight, borderColor: colors.borderStrong },
  identityLabel: { color: colors.primaryDark },
  identityValue: { fontSize: 16, lineHeight: 26, fontWeight: "700", color: colors.text, marginVertical: spacing.xs },
  selected: { fontSize: 13, lineHeight: 20, color: colors.primaryDark, fontWeight: "600", marginTop: spacing.sm },
  button: { marginTop: spacing.sm, minHeight: 50, paddingVertical: spacing.sm },
  buttonText: { textAlign: "center", flexShrink: 1, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
});
