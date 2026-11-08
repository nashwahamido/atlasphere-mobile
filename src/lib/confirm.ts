import { Alert, Platform } from 'react-native';

// "Are you sure?" that works on phones and in the browser.
export function confirmAction(title: string, message: string, actionLabel: string, destructive = true): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(title + '\n\n' + message));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: actionLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

// Simple message (Alert.alert is a no-op on the web).
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? title + '\n\n' + message : title);
    return;
  }
  Alert.alert(title, message);
}
