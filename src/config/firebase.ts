import { initializeApp } from "firebase/app"; //Projeyi Firebase’e bağlayan başlatan temel yapı.
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
// Firebase bilgileri
};

const app = initializeApp(firebaseConfig); //Firebase uygulamasını başlatır ve yapılandırmayı uygular.

export const auth = getAuth(app);
export const db = getFirestore(app);
