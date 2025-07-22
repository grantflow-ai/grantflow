"use client";

import { type FirebaseApp, initializeApp } from "firebase/app";
import { type Auth, browserSessionPersistence, getAuth, setPersistence, updateProfile, type User } from "firebase/auth";
import { deleteObject, type FirebaseStorage, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

import type { UserInfo } from "@/types/user";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";

const instanceRef: { app: FirebaseApp | null; auth: Auth | null; storage: FirebaseStorage | null } = {
	app: null,
	auth: null,
	storage: null,
};

/**
 * Converts a Firebase User object to our UserInfo type
 */
export function convertFirebaseUser(user: User): UserInfo {
	return {
		customClaims: null, // Not available on client-side User object
		disabled: false, // Firebase Auth User doesn't have this property on client
		displayName: user.displayName,
		email: user.email,
		emailVerified: user.emailVerified,
		phoneNumber: user.phoneNumber,
		photoURL: user.photoURL,
		providerData: user.providerData.map((provider) => ({
			displayName: provider.displayName,
			email: provider.email,
			phoneNumber: provider.phoneNumber,
			photoURL: provider.photoURL,
			providerId: provider.providerId,
			uid: provider.uid,
		})),
		tenantId: user.tenantId ?? null,
		uid: user.uid,
	};
}

/**
 * Creates a minimal UserInfo object for simple cases
 * Useful when you need to create a UserInfo from partial data
 */
export function createUserInfo(data: {
	displayName?: null | string;
	email?: null | string;
	emailVerified?: boolean;
	phoneNumber?: null | string;
	photoURL?: null | string;
	providerId?: string;
	uid: string;
}): UserInfo {
	const {
		displayName = null,
		email = null,
		emailVerified = false,
		phoneNumber = null,
		photoURL = null,
		providerId = "firebase",
		uid,
	} = data;

	return {
		customClaims: null,
		disabled: false,
		displayName,
		email,
		emailVerified,
		phoneNumber,
		photoURL,
		providerData: providerId
			? [
					{
						displayName,
						email,
						phoneNumber,
						photoURL,
						providerId,
						uid,
					},
				]
			: [],
		tenantId: null,
		uid,
	};
}

/**
 * Deletes the user's profile photo from Firebase Storage and updates their profile
 */
export async function deleteProfilePhoto(user: User): Promise<void> {
	const auth = getFirebaseAuth();

	if (auth.currentUser?.uid !== user.uid) {
		throw new Error("User mismatch");
	}

	try {
		// If user has a photoURL, try to delete it from storage
		if (user.photoURL) {
			const storage = getFirebaseStorage();

			// Extract the path from the photoURL if it's a Firebase Storage URL
			if (user.photoURL.includes("firebase")) {
				try {
					const photoRef = ref(storage, user.photoURL);
					await deleteObject(photoRef);
					log.info("Profile photo deleted from storage", { uid: user.uid });
				} catch (error) {
					// If file doesn't exist or can't be deleted, continue anyway
					log.warn("Could not delete profile photo from storage", {
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}

		// Update the user's profile to remove the photo
		await updateProfile(user, {
			photoURL: null,
		});

		log.info("Profile photo removed from user profile", { uid: user.uid });
	} catch (error) {
		log.error("Error deleting profile photo", error);
		throw new Error("Failed to delete profile photo");
	}
}

export function getFirebaseApp(): FirebaseApp {
	if (!instanceRef.app) {
		const env = getEnv();
		log.info("Initializing Firebase app", {
			apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ? "***" : "missing",
			authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
			projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
		});

		instanceRef.app = initializeApp({
			apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
			appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
			authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
			measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
			messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID,
			projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
			storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
		});
	}

	return instanceRef.app;
}

export function getFirebaseAuth(): Auth {
	if (!instanceRef.auth) {
		log.info("Initializing Firebase Auth");
		const app = getFirebaseApp();
		const auth = getAuth(app);
		void setPersistence(auth, browserSessionPersistence);

		instanceRef.auth = auth;
	}

	return instanceRef.auth;
}

export function getFirebaseStorage(): FirebaseStorage {
	if (!instanceRef.storage) {
		log.info("Initializing Firebase Storage");
		const app = getFirebaseApp();
		instanceRef.storage = getStorage(app);
	}

	return instanceRef.storage;
}

/**
 * Uploads a profile photo to Firebase Storage and updates the user's profile
 */
export async function uploadProfilePhoto(user: User, file: File): Promise<string> {
	const storage = getFirebaseStorage();
	const auth = getFirebaseAuth();

	if (auth.currentUser?.uid !== user.uid) {
		throw new Error("User mismatch");
	}

	// Create a reference to the user's profile photo
	const photoRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}-${file.name}`);

	try {
		// Upload the file
		const snapshot = await uploadBytes(photoRef, file);

		// Get the download URL
		const downloadURL = await getDownloadURL(snapshot.ref);

		// Update the user's profile
		await updateProfile(user, {
			photoURL: downloadURL,
		});

		log.info("Profile photo uploaded successfully", { uid: user.uid, url: downloadURL });
		return downloadURL;
	} catch (error) {
		log.error("Error uploading profile photo", error);
		throw new Error("Failed to upload profile photo");
	}
}
