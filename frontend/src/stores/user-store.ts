import { updateEmail, updateProfile } from "firebase/auth";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { UserInfo } from "@/types/user";
import { deleteProfilePhoto, getFirebaseAuth, uploadProfilePhoto } from "@/utils/firebase";
import { log } from "@/utils/logger";

interface UserStore {
	clearUser: () => void;
	deleteProfilePhoto: () => Promise<void>;
	dismissWelcomeModal: () => void;
	hasSeenWelcomeModal: boolean;
	isAuthenticated: boolean;
	setUser: (user: null | UserInfo) => void;
	updateDisplayName: (displayName: string) => Promise<void>;
	updateEmail: (email: string) => Promise<void>;
	updateProfilePhoto: (file: File) => Promise<void>;
	user: null | UserInfo;
}

export const useUserStore = create<UserStore>()(
	devtools(
		persist(
			(set, get) => ({
				clearUser: () => {
					set({
						hasSeenWelcomeModal: false,
						isAuthenticated: false,
						user: null,
					});
				},
				deleteProfilePhoto: async () => {
					const auth = getFirebaseAuth();
					const { currentUser } = auth;
					const { user } = get();

					if (!(currentUser && user)) {
						throw new Error("No authenticated user");
					}

					try {
						await deleteProfilePhoto(currentUser);
						set({
							user: {
								...user,
								photoURL: null,
							},
						});
						log.info("Profile photo deleted successfully");
					} catch (error) {
						log.error("Error deleting profile photo", error);
						throw error;
					}
				},
				dismissWelcomeModal: () => {
					set({ hasSeenWelcomeModal: true });
				},
				hasSeenWelcomeModal: false,
				isAuthenticated: false,
				setUser: (user) => {
					set({
						isAuthenticated: !!user,
						user,
					});
				},
				updateDisplayName: async (displayName: string) => {
					const auth = getFirebaseAuth();
					const { currentUser } = auth;
					const { user } = get();

					if (!(currentUser && user)) {
						throw new Error("No authenticated user");
					}

					try {
						await updateProfile(currentUser, { displayName });
						set({
							user: {
								...user,
								displayName,
							},
						});
						log.info("Display name updated successfully", { displayName });
					} catch (error) {
						log.error("Error updating display name", error);
						throw error;
					}
				},
				updateEmail: async (email: string) => {
					const auth = getFirebaseAuth();
					const { currentUser } = auth;
					const { user } = get();

					if (!(currentUser && user)) {
						throw new Error("No authenticated user");
					}

					try {
						await updateEmail(currentUser, email);
						set({
							user: {
								...user,
								email,
							},
						});
						log.info("Email updated successfully", { email });
					} catch (error) {
						log.error("Error updating email", error);
						throw error;
					}
				},
				updateProfilePhoto: async (file: File) => {
					const auth = getFirebaseAuth();
					const { currentUser } = auth;
					const { user } = get();

					if (!(currentUser && user)) {
						throw new Error("No authenticated user");
					}

					try {
						const photoURL = await uploadProfilePhoto(currentUser, file);
						set({
							user: {
								...user,
								photoURL,
							},
						});
						log.info("Profile photo updated successfully", { photoURL });
					} catch (error) {
						log.error("Error updating profile photo", error);
						throw error;
					}
				},
				user: null,
			}),
			{
				name: "user-store",
			},
		),
		{
			name: "UserStore",
		},
	),
);
