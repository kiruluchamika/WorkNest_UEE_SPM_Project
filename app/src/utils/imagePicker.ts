import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Alert } from "react-native";

const MAX_DIMENSION = 1080;
const JPEG_COMPRESSION = 0.6;

async function compressToDataUri(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_COMPRESSION, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  if (!result.base64) {
    throw new Error("Could not process the selected image.");
  }

  return `data:image/jpeg;base64,${result.base64}`;
}

/**
 * Opens the device photo library, lets the user pick and crop an image,
 * then returns it as a compressed base64 data URI ready to store directly
 * in an `imageUrl`/`avatarUrl` field. Returns null if the user cancels.
 */
export async function pickImageFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Permission needed",
      "Please allow photo library access in your device settings to attach an image."
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return compressToDataUri(result.assets[0].uri);
}

/** Opens the device camera and returns a compressed base64 data URI, or null if cancelled. */
export async function captureImageFromCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Permission needed",
      "Please allow camera access in your device settings to take a photo."
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return compressToDataUri(result.assets[0].uri);
}
