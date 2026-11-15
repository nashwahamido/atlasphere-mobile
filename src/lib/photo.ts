import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { notify } from './confirm';

// Let the person pick a photo and package it for upload (field "photo").
// Returns null if they cancel or don't allow access.
export async function pickPhotoForm(aspect: [number, number]): Promise<FormData | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    notify('Photos access needed', 'Allow Atlasphere to use your photos in Settings to add a picture.');
    return null;
  }
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 1 });
  if (picked.canceled || !picked.assets?.length) return null;
  const asset = picked.assets[0];
  // Phone photos can be 10 MB+, more than the server accepts (it cuts the
  // upload off, which looks like a lost connection). Shrink to at most
  // 1600 px wide as a JPEG first: a few hundred KB, still sharp on screen.
  let uri = asset.uri;
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if ((asset.width || 0) > 1600) ctx.resize({ width: 1600 });
    const image = await ctx.renderAsync();
    uri = (await image.saveAsync({ compress: 0.75, format: SaveFormat.JPEG })).uri;
  } catch {
    // Keep the original if resizing isn't possible.
  }
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('photo', blob, 'photo.jpg');
  } else {
    // React Native's FormData takes { uri, name, type } for files.
    form.append('photo', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  return form;
}
