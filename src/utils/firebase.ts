"use client";

import { Auth, getAuth } from "firebase/auth";
import { FirebaseApp, initializeApp } from "firebase/app";
import { getEnv } from "@/utils/env";

const instanceRef: { app: FirebaseApp | null; auth: Auth | null } = {
	app: null,
	auth: null,
};

/**
 * Get the Firebase app instance.
 * @returns - The Firebase app instance.
 */
export function getFirebaseApp(): FirebaseApp {
	if (!instanceRef.app) {
		instanceRef.app = initializeApp({
			apiKey: getEnv().NEXT_PUBLIC_FIREBASE_API_KEY,
			appId: getEnv().NEXT_PUBLIC_FIREBASE_APP_ID,
			authDomain: getEnv().NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
			measurementId: getEnv().NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
			messagingSenderId: getEnv().NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID,
			projectId: getEnv().NEXT_PUBLIC_FIREBASE_PROJECT_ID,
			storageBucket: getEnv().NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
		});
	}

	return instanceRef.app;
}

/**
 * Get the Firebase Auth instance.
 * @returns - The Firebase Auth instance.
 * @throws - If the Firebase Auth instance could not be created.
 */
export function getFirebaseAuth(): Auth {
	if (!instanceRef.auth) {
		const app = getFirebaseApp();
		const auth = getAuth(app);

		instanceRef.auth = auth;
	}

	return instanceRef.auth;
}
