import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Generates client-side notifications on login:
 * 1. Weekly health report reminder
 * 2. Due follow-up reminders (records whose followUpDate has passed)
 * 3. Pending confirmation reminder
 *
 * Duplicate prevention: checks if ANY notification exists for the same
 * recordId+type (not just unread ones), so marking as read doesn't re-trigger.
 */
export async function generateNotificationsOnLogin(userId: string, userProfile: any) {
  const notifRef = collection(db, `users/${userId}/notifications`);

  // ── 1. Weekly Health Report Reminder ──────────────────────────────────────
  try {
    const existingWeekly = await getDocs(
      query(notifRef, where('type', '==', 'health_report'), where('read', '==', false))
    );
    if (existingWeekly.empty) {
      const oldReports = await getDocs(
        query(notifRef, where('type', '==', 'health_report'))
      );
      let shouldCreate = true;
      if (!oldReports.empty) {
        const sorted = oldReports.docs
          .map((d) => d.data())
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.()?.getTime() ?? 0;
            const bTime = b.createdAt?.toDate?.()?.getTime() ?? 0;
            return bTime - aTime;
          });
        const lastTs = sorted[0]?.createdAt?.toDate?.()?.getTime() ?? 0;
        if (Date.now() - lastTs < 7 * 24 * 60 * 60 * 1000) {
          shouldCreate = false;
        }
      }
      if (shouldCreate) {
        await addDoc(notifRef, {
          type: 'health_report',
          title: 'Weekly Health Report Ready',
          message: 'Get your AI-powered health summary for the past 7 days.',
          read: false,
          createdAt: serverTimestamp(),
          actionUrl: '/health',
        });
      }
    }
  } catch (e) {
    console.error('Failed to generate health report notification:', e);
  }

  // ── 2. Due Follow-up Reminders ────────────────────────────────────────────
  try {
    const recordsRef = collection(db, `users/${userId}/medicalRecords`);
    const dueSnap = await getDocs(
      query(recordsRef, where('followedUp', '==', false))
    );
    const dueRecords = dueSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as any))
      .filter((r) => r.followUpDate && new Date(r.followUpDate).getTime() <= Date.now());

    console.log('[Notifications] Checking follow-ups. Due records:', dueRecords.length,
      dueRecords.map((r) => `${r.targetName} (due: ${r.followUpDate})`));

    for (const record of dueRecords) {
      // FIX: Check if ANY notification exists for this record (read OR unread)
      // This prevents re-triggering after user has already read/dismissed
      const dupSnap = await getDocs(
        query(
          notifRef,
          where('type', '==', 'follow_up'),
          where('recordId', '==', record.id),
        )
      );
      if (dupSnap.empty) {
        await addDoc(notifRef, {
          type: 'follow_up',
          title: `Follow-up: ${record.targetName}`,
          message: `It's time to check in on your ${record.type === 'doctor_visit' ? 'appointment' : 'medication'} with ${record.targetName}.`,
          read: false,
          createdAt: serverTimestamp(),
          actionUrl: '/followups',
          recordId: record.id,
        });
      }
    }
  } catch (e) {
    console.error('Failed to generate follow-up notifications:', e);
  }

  // ── 3. Pending Confirmation Reminder ──────────────────────────────────────
  try {
    const recordsRef = collection(db, `users/${userId}/medicalRecords`);
    const pendingSnap = await getDocs(
      query(recordsRef, where('status', '==', 'pending_confirmation'))
    );
    if (!pendingSnap.empty) {
      const dupSnap = await getDocs(
        query(notifRef, where('type', '==', 'pending_confirmation'), where('read', '==', false))
      );
      if (dupSnap.empty) {
        await addDoc(notifRef, {
          type: 'pending_confirmation',
          title: `${pendingSnap.size} Unconfirmed Action${pendingSnap.size > 1 ? 's' : ''}`,
          message: 'You have pending appointments or medicine orders that need your confirmation.',
          read: false,
          createdAt: serverTimestamp(),
          actionUrl: '/records',
        });
      }
    }
  } catch (e) {
    console.error('Failed to generate pending confirmation notification:', e);
  }
}
