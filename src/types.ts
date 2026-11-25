import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type HistoryRecordType =
  | 'plant'
  | 'flower'
  | 'pest'
  | 'chat'
  | 'soil'
  | 'crop'
  | 'expense'
  | 'water'
  | 'weather';

export interface HistoryItem {
  id: string;
  type: HistoryRecordType;
  result: string;
  timestamp: string;
  details: any;
  rawDate?: number;
  healthScore?: number;
}

export interface OfflinePlantRequest {
  id: string;
  image: string;
  language: string;
  timestamp: number;
  formattedTime: string;
  status: 'queued' | 'syncing' | 'error';
}

export interface FarmerUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isGuest?: boolean;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

export const optimizeImageForFastAnalysis = (
  base64Str: string,
  maxWidth = 900,
  quality = 0.8
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxWidth) {
        const ratio = Math.min(maxWidth / width, maxWidth / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};
