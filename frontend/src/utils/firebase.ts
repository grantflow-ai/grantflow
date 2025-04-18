"use client";

import { getEnv } from "@/utils/env";
import { FirebaseApp, initializeApp } from "firebase/app";
import { Auth, browserSessionPersistence, getAuth, setPersistence } from "firebase/auth";

const instanceRef: { app: FirebaseApp | null; auth: Auth | null } = {
	app: null,
	auth: null,
};

export function getFirebaseApp(): FirebaseApp {
	instanceRef.app ??= initializeApp({
		apiKey: getEnv().NEXT_PUBLIC_FIREBASE_API_KEY,
		appId: getEnv().NEXT_PUBLIC_FIREBASE_APP_ID,
		authDomain: getEnv().NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
		measurementId: getEnv().NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
		messagingSenderId: getEnv().NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID,
		projectId: getEnv().NEXT_PUBLIC_FIREBASE_PROJECT_ID,
		storageBucket: getEnv().NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	});

	return instanceRef.app;
}

export function getFirebaseAuth(): Auth {
	if (!instanceRef.auth) {
		const app = getFirebaseApp();
		const auth = getAuth(app);
		void setPersistence(auth, browserSessionPersistence);

		instanceRef.auth = auth;
	}

	return instanceRef.auth;
}
