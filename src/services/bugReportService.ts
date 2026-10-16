import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BugReport } from '../types/bugReport';

const LOCAL_STORAGE_KEY = 'mistwalker_bug_reports_v1';

function getLocalReports(): BugReport[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse local bug reports:', err);
    return [];
  }
}

function saveLocalReports(reports: BugReport[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('Failed to write local bug reports:', err);
  }
}

/**
 * Uploads a screenshot image (File, Blob, or base64 data string)
 * Attempts server static file persistence via /api/upload or /api/upload-base64,
 * and gracefully falls back to base64 Data URL if offline.
 */
export async function uploadScreenshot(
  fileOrBase64: File | Blob | string,
  filename?: string
): Promise<string> {
  // Case 1: Base64 string
  if (typeof fileOrBase64 === 'string') {
    if (fileOrBase64.startsWith('http://') || fileOrBase64.startsWith('https://') || fileOrBase64.startsWith('/uploads/')) {
      return fileOrBase64;
    }
    try {
      const res = await fetch('/api/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: fileOrBase64,
          filename: filename || `bug_screen_${Date.now()}`,
          type: 'bug_screenshot'
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) return json.url;
      }
    } catch (err) {
      console.warn('[uploadScreenshot] Server base64 upload failed, using data URL fallback:', err);
    }
    return fileOrBase64;
  }

  // Case 2: File or Blob object
  try {
    const formData = new FormData();
    const fname = filename || (fileOrBase64 instanceof File ? fileOrBase64.name : `screenshot_${Date.now()}.png`);
    formData.append('file', fileOrBase64, fname);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const json = await res.json();
      if (json.url) return json.url;
    }
  } catch (err) {
    console.warn('[uploadScreenshot] Server multipart upload failed, generating data URL:', err);
  }

  // Fallback to FileReader base64
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(fileOrBase64);
  });
}

/**
 * Creates and logs a new bug report to Firestore and localStorage
 */
export async function createBugReport(
  data: Omit<BugReport, 'id' | 'createdAt' | 'status'>
): Promise<BugReport> {
  const id = `bug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const report: BugReport = {
    ...data,
    id,
    status: 'open',
    createdAt: now,
    updatedAt: now
  };

  // 1. Save to localStorage immediately
  const localList = getLocalReports();
  localList.unshift(report);
  saveLocalReports(localList);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, 'bug_reports', id);
    await setDoc(docRef, report);
  } catch (err) {
    console.warn('[BugReportService] Firestore save error (local copy preserved):', err);
  }

  return report;
}

/**
 * Fetches all bug reports, merging Firestore records with localStorage records
 */
export async function getBugReports(): Promise<BugReport[]> {
  const localList = getLocalReports();
  const map = new Map<string, BugReport>();

  // Add local reports first
  for (const r of localList) {
    map.set(r.id, r);
  }

  // Fetch from Firestore
  try {
    const querySnapshot = await getDocs(collection(db, 'bug_reports'));
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as BugReport;
      if (data && data.id) {
        // If firestore has updated data, prioritize it
        map.set(data.id, data);
      }
    });
  } catch (err) {
    console.warn('[BugReportService] Firestore list error, returning local reports:', err);
  }

  const merged = Array.from(map.values());
  // Sort descending by createdAt
  merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Sync back to local storage
  saveLocalReports(merged);

  return merged;
}

/**
 * Updates a bug report's status or DM notes
 */
export async function updateBugReport(
  id: string,
  updates: Partial<BugReport>
): Promise<void> {
  const now = Date.now();
  const localList = getLocalReports();
  const idx = localList.findIndex(r => r.id === id);
  if (idx !== -1) {
    localList[idx] = { ...localList[idx], ...updates, updatedAt: now };
    saveLocalReports(localList);
  }

  try {
    const docRef = doc(db, 'bug_reports', id);
    await updateDoc(docRef, { ...updates, updatedAt: now });
  } catch (err) {
    console.warn('[BugReportService] Firestore update error:', err);
  }
}

/**
 * Deletes a bug report
 */
export async function deleteBugReport(id: string): Promise<void> {
  const localList = getLocalReports().filter(r => r.id !== id);
  saveLocalReports(localList);

  try {
    const docRef = doc(db, 'bug_reports', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[BugReportService] Firestore delete error:', err);
  }
}
