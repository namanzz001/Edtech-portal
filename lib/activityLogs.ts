import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export interface ActivityLog {
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp?: Date;
}

export async function logActivity({ userId, userName, action, details }: ActivityLog) {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      userName,
      action,
      details: details || '',
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
} 