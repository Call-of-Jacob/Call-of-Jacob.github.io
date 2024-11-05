import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import Logger from '../utils/Logger';

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = new Set();
        this.setupAuthStateListener();
    }

    setupAuthStateListener() {
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.notifyAuthStateListeners(user);
        });
    }

    addAuthStateListener(listener) {
        this.authStateListeners.add(listener);
    }

    removeAuthStateListener(listener) {
        this.authStateListeners.delete(listener);
    }

    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(listener => {
            try {
                listener(user);
            } catch (error) {
                Logger.error('Auth state listener error:', error);
            }
        });
    }

    async registerUser(username, email, password) {
        try {
            // Input validation
            this.validateRegistrationInput(username, email, password);

            // Create Firebase auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update profile with username
            await updateProfile(user, { displayName: username });

            // Create user profile in Firestore
            await this.createUserProfile(user.uid, username, email);

            return user;
        } catch (error) {
            Logger.error('Registration error:', error);
            throw this.handleAuthError(error);
        }
    }

    validateRegistrationInput(username, email, password) {
        if (!username || username.length < 3) {
            throw new Error('Username must be at least 3 characters long');
        }

        if (!email || !this.isValidEmail(email)) {
            throw new Error('Invalid email address');
        }

        if (!password || password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async createUserProfile(uid, username, email) {
        try {
            await setDoc(doc(db, 'users', uid), {
                username,
                email,
                stats: {
                    level: 1,
                    xp: 0,
                    kills: 0,
                    deaths: 0,
                    wins: 0,
                    losses: 0
                },
                loadouts: [],
                unlocks: [],
                achievements: [],
                created: new Date(),
                lastLogin: new Date()
            });
        } catch (error) {
            Logger.error('Error creating user profile:', error);
            throw new Error('Failed to create user profile');
        }
    }

    async loginUser(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await this.updateLastLogin(userCredential.user.uid);
            return userCredential.user;
        } catch (error) {
            Logger.error('Login error:', error);
            throw this.handleAuthError(error);
        }
    }

    async updateLastLogin(uid) {
        try {
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
        } catch (error) {
            Logger.error('Error updating last login:', error);
        }
    }

    async logoutUser() {
        try {
            await signOut(auth);
        } catch (error) {
            Logger.error('Logout error:', error);
            throw this.handleAuthError(error);
        }
    }

    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            Logger.error('Password reset error:', error);
            throw this.handleAuthError(error);
        }
    }

    async getUserProfile(uid) {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (!userDoc.exists()) {
                throw new Error('User profile not found');
            }
            return userDoc.data();
        } catch (error) {
            Logger.error('Error fetching user profile:', error);
            throw new Error('Failed to fetch user profile');
        }
    }

    handleAuthError(error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return new Error('Email is already registered');
            case 'auth/invalid-email':
                return new Error('Invalid email address');
            case 'auth/operation-not-allowed':
                return new Error('Operation not allowed');
            case 'auth/weak-password':
                return new Error('Password is too weak');
            case 'auth/user-disabled':
                return new Error('Account has been disabled');
            case 'auth/user-not-found':
                return new Error('User not found');
            case 'auth/wrong-password':
                return new Error('Incorrect password');
            case 'auth/too-many-requests':
                return new Error('Too many attempts. Please try again later');
            default:
                return new Error('Authentication failed');
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

export default new AuthSystem(); 