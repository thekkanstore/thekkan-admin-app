import { messaging } from "./firebase";
import { getToken } from "firebase/messaging";

export const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
      console.log("FCM Token:", token);
      return token;
    } else {
      console.log("Permission not granted");
      return null;
    }
  } catch (err) {
    console.error("Error getting token", err);
    return null;
  }
};