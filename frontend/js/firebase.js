// js/firebase.js

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6-XP3BcSfO93RJhLESWRdAy2VDDqV5rY",
  authDomain: "seatreservationsystem-8e98f.firebaseapp.com",
  projectId: "seatreservationsystem-8e98f",
  storageBucket: "seatreservationsystem-8e98f.appspot.com",
  messagingSenderId: "929124421905",
  appId: "1:929124421905:web:792ea35ec285a9a9ebbcb0"
};

// ✅ Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized");
} catch (err) {
  alert("❌ Firebase not initialized!");
  console.error(err);
}