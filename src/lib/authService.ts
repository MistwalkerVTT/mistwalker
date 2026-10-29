import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { UserAccount, SubscriptionTier } from '../types/auth';

const USER_CACHE_KEY = 'mw_cached_user_account';

let currentUserAccount: UserAccount | null = null;
const authListeners = new Set<(user: UserAccount | null) => void>();

function getCachedUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedUser(acc: UserAccount | null) {
  try {
    if (acc) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(acc));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // Ignore storage quota
  }
}

async function syncUserDoc(user: User, customDisplayName?: string): Promise<UserAccount> {
  const userRef = doc(db, 'users', user.uid);
  let tier: SubscriptionTier = 'free';
  let displayName = customDisplayName || user.displayName || (user.isAnonymous ? 'Guest Adventurer' : 'Adventurer');

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      tier = (data.tier as SubscriptionTier) || 'free';
      if (!customDisplayName && data.displayName) {
        displayName = data.displayName;
      }
    }
  } catch (err) {
    console.warn('Could not read user profile doc, using default:', err);
  }

  const account: UserAccount = {
    uid: user.uid,
    email: user.email,
    displayName,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
    tier,
    createdAt: Date.now(),
    lastLoginAt: Date.now()
  };

  try {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName,
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
      tier,
      lastLoginAt: Date.now(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not persist user doc:', err);
  }

  return account;
}

// Initialize Auth Listener
onAuthStateChanged(auth, async (firebaseUser: User | null) => {
  if (!firebaseUser) {
    currentUserAccount = null;
    setCachedUser(null);
    authListeners.forEach(listener => listener(null));
    return;
  }

  try {
    const account = await syncUserDoc(firebaseUser);
    currentUserAccount = account;
    setCachedUser(account);
    authListeners.forEach(listener => listener(account));
  } catch (err) {
    console.error('Failed to sync auth state:', err);
  }
});

export function getCurrentUser(): UserAccount | null {
  return currentUserAccount || getCachedUser();
}

export function subscribeToAuth(callback: (user: UserAccount | null) => void): () => void {
  authListeners.add(callback);
  callback(currentUserAccount || getCachedUser());
  return () => {
    authListeners.delete(callback);
  };
}

export async function signInWithGoogle(): Promise<UserAccount> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const account = await syncUserDoc(cred.user);
  currentUserAccount = account;
  setCachedUser(account);
  authListeners.forEach(listener => listener(account));
  return account;
}

export async function signInWithEmail(email: string, pass: string): Promise<UserAccount> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const account = await syncUserDoc(cred.user);
  currentUserAccount = account;
  setCachedUser(account);
  authListeners.forEach(listener => listener(account));
  return account;
}

export async function signUpWithEmail(email: string, pass: string, displayName: string): Promise<UserAccount> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  const account = await syncUserDoc(cred.user, displayName.trim());
  currentUserAccount = account;
  setCachedUser(account);
  authListeners.forEach(listener => listener(account));
  return account;
}

export async function signInAsGuest(guestName?: string): Promise<UserAccount> {
  const cred = await signInAnonymously(auth);
  const name = guestName?.trim() || `Player-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  try {
    await updateProfile(cred.user, { displayName: name });
  } catch {
    // Continue
  }
  const account = await syncUserDoc(cred.user, name);
  currentUserAccount = account;
  setCachedUser(account);
  authListeners.forEach(listener => listener(account));
  return account;
}

export async function logOut(): Promise<void> {
  await signOut(auth);
  currentUserAccount = null;
  setCachedUser(null);
  authListeners.forEach(listener => listener(null));
}

export async function updateDisplayName(newName: string): Promise<void> {
  if (!auth.currentUser) return;
  await updateProfile(auth.currentUser, { displayName: newName.trim() });
  const account = await syncUserDoc(auth.currentUser, newName.trim());
  currentUserAccount = account;
  setCachedUser(account);
  authListeners.forEach(listener => listener(account));
}
