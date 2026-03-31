import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_DATABASE_URL,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_STORAGE_BUCKET,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_MEASUREMENT_ID
} from '$env/static/public';

const firebaseConfig = {
	apiKey: PUBLIC_FIREBASE_API_KEY,
	authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
	databaseURL: PUBLIC_FIREBASE_DATABASE_URL,
	projectId: PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: PUBLIC_FIREBASE_APP_ID,
	measurementId: PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const saveSession = async (uid: string, data: object) => {
	await setDoc(doc(db, 'uist', uid), data);
};
