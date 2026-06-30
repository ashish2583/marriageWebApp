import {initializeApp} from 'firebase/app';
import {getAnalytics, isSupported} from 'firebase/analytics';
import {getFirestore} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyATmnyHUGv473VbFwTm1JdO-ex0JFbF2DU',
  authDomain: 'merrage-20b23.firebaseapp.com',
  databaseURL: 'https://merrage-20b23-default-rtdb.firebaseio.com',
  projectId: 'merrage-20b23',
  storageBucket: 'merrage-20b23.appspot.com',
  messagingSenderId: '414842305603',
  appId: '1:414842305603:web:64c64ffce538e8b2ca68f6',
  measurementId: 'G-GB1EXCX3RJ',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firestoreDb = getFirestore(firebaseApp);

if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) getAnalytics(firebaseApp);
  }).catch(() => {});
}
