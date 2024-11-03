import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: "AIzaSyB3Hu6Nn0b3_30nqoN9kMlE3oaa04VijTI",
    authDomain: "call-of-jacob.firebaseapp.com",
    projectId: "call-of-jacob",
    storageBucket: "call-of-jacob.firebasestorage.app",
    messagingSenderId: "354335345072",
    appId: "1:354335345072:web:a77085f10df89f92d4ee75",
    measurementId: "G-6ZLPL9EHDM",
    databaseURL: "https://call-of-jacob-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtime = getDatabase(app);
export const analytics = getAnalytics(app);

export default app; 