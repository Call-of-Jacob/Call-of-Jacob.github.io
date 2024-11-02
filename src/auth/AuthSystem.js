import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

class AuthSystem {
    static async registerUser(username, email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user profile in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                username,
                email,
                stats: {
                    level: 1,
                    xp: 0,
                    kills: 0,
                    deaths: 0
                },
                loadouts: [],
                unlocks: [],
                achievements: [],
                created: new Date()
            });

            return user;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    static async loginUser(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    static async logoutUser() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }
}

export default AuthSystem; 