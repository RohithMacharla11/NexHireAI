'use server';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let firestore: Firestore;

export function initializeFirebaseForServer() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
  } else {
    app = getApp();
    firestore = getFirestore(app);
  }
  return { app, firestore };
}
