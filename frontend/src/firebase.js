import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCi8ouKqSkT-K4lqJp8pgDcvQbnVrdFgx4",
  authDomain: "life-compass-507705.firebaseapp.com",
  projectId: "life-compass-507705",
  storageBucket: "life-compass-507705.firebasestorage.app",
  messagingSenderId: "328224107086",
  appId: "1:328224107086:web:512fcecb461c7d22e9711f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);