/**
 * Permission Helper untuk Android
 * Handles Camera, Storage, dan Location permissions
 */

import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/**
 * Request Camera Permission
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    if (Capacitor.getPlatform() !== 'android') {
      return true; // Web/iOS handled differently
    }

    const permissions = await Camera.checkPermissions();
    
    if (permissions.camera === 'granted') {
      console.log('Camera permission already granted');
      return true;
    }

    // Request permission
    const result = await Camera.requestPermissions({ permissions: ['camera'] });
    
    if (result.camera === 'granted') {
      console.log('Camera permission granted');
      return true;
    } else {
      console.warn('Camera permission denied');
      return false;
    }
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
}

/**
 * Check Camera Permission
 */
export async function checkCameraPermission(): Promise<boolean> {
  try {
    if (Capacitor.getPlatform() !== 'android') {
      return true;
    }

    const permissions = await Camera.checkPermissions();
    return permissions.camera === 'granted';
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
}

/**
 * Request Storage Permission (for downloads)
 */
export async function requestStoragePermission(): Promise<boolean> {
  try {
    if (Capacitor.getPlatform() !== 'android') {
      return true; // Web/iOS handled differently
    }

    const permissions = await Filesystem.checkPermissions();
    
    if (permissions.publicStorage === 'granted') {
      console.log('Storage permission already granted');
      return true;
    }

    // Request permission
    const result = await Filesystem.requestPermissions();
    
    if (result.publicStorage === 'granted') {
      console.log('Storage permission granted');
      return true;
    } else {
      console.warn('Storage permission denied');
      return false;
    }
  } catch (error) {
    console.error('Error requesting storage permission:', error);
    return false;
  }
}

/**
 * Check Storage Permission
 */
export async function checkStoragePermission(): Promise<boolean> {
  try {
    if (Capacitor.getPlatform() !== 'android') {
      return true;
    }

    const permissions = await Filesystem.checkPermissions();
    return permissions.publicStorage === 'granted';
  } catch (error) {
    console.error('Error checking storage permission:', error);
    return false;
  }
}

/**
 * Request All App Permissions (Camera + Storage + Location)
 * Call this on app startup or first login
 */
export async function requestAllPermissions(): Promise<{
  camera: boolean;
  storage: boolean;
}> {
  console.log('Requesting all app permissions...');

  const results = {
    camera: false,
    storage: false,
  };

  // Request camera permission
  results.camera = await requestCameraPermission();
  
  // Request storage permission
  results.storage = await requestStoragePermission();

  console.log('Permission results:', results);
  
  return results;
}

/**
 * Check All Permissions Status
 */
export async function checkAllPermissions(): Promise<{
  camera: boolean;
  storage: boolean;
}> {
  const camera = await checkCameraPermission();
  const storage = await checkStoragePermission();

  return { camera, storage };
}
