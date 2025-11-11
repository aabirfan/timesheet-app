import { db } from '../firebase.js';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const col = () => collection(db, 'entries');

export async function addEntry({ uid, date, start, end, task, comments, minutes, hours, week }) {
  await addDoc(col(), {
    uid, date, start, end, minutes, hours, task, comments, week, createdAt: serverTimestamp()
  });
}

export async function updateEntry(id, data) {
  const ref = doc(db, 'entries', id);
  await updateDoc(ref, data);
}

export async function deleteEntry(id) {
  const ref = doc(db, 'entries', id);
  await deleteDoc(ref);
}

export function listenToEntries(uid, handleSnapshot) {
  const q = query(
    col(),
    where('uid', '==', uid),
    orderBy('date', 'desc'),
    orderBy('start', 'desc')
  );
  return onSnapshot(q, handleSnapshot);
}
