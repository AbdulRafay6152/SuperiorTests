import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { setCurrentUser } from './firestoreStore';

interface UserData {
  uid: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const data = userDoc.data();
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: data?.name || firebaseUser.displayName || '',
          };
          setUser(userData);
          // Sync with firestoreStore
          setCurrentUser({
            id: userData.uid,
            email: userData.email,
            name: userData.name,
            createdAt: data?.createdAt || new Date().toISOString()
          });
        } catch (err) {
          console.error('Error fetching user data:', err);
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || '',
          };
          setUser(userData);
          setCurrentUser({
            id: userData.uid,
            email: userData.email,
            name: userData.name,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        setUser(null);
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
