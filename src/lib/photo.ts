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
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.8 });
  if (picked.canceled || !picked.assets?.length) return null;
  const asset = picked.assets[0];
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(asset.uri)).blob();
    form.append('photo', blob, asset.fileName || 'photo.jpg');
  } else {
    // React Native's FormData takes { uri, name, type } for files.
    form.append('photo', { uri: asset.uri, name: asset.fileName || 'photo.jpg', type: asset.mimeType || 'image/jpeg' } as unknown as Blob);
  }
  return form;
}
