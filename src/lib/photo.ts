import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { notify } from './confirm';

// A picked photo, ready to send: a JPEG (at most 1600 px wide) as base64.
// Sent as JSON because Expo's fetch can't send React Native's { uri } form
// uploads.
export type PhotoUpload = { photoBase64: string };

// Let the person pick a photo. Returns null if they cancel or don't allow access.
export async function pickPhotoForm(aspect: [number, number]): Promise<PhotoUpload | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    notify('Photos access needed', 'Allow Atlasphere to use your photos in Settings to add a picture.');
    return null;
  }
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 1 });
  if (picked.canceled || !picked.assets?.length) return null;
  const asset = picked.assets[0];
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if ((asset.width || 0) > 1600) ctx.resize({ width: 1600 });
    const image = await ctx.renderAsync();
    const saved = await image.saveAsync({ compress: 0.75, format: SaveFormat.JPEG, base64: true });
    if (!saved.base64) throw new Error('no image data');
    return { photoBase64: saved.base64 };
  } catch (e) {
    console.warn('Photo preparation failed:', e);
    notify('Couldn’t use that photo', 'Please try a different one.');
    return null;
  }
}
