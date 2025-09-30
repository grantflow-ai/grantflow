import { create } from "zustand";

interface SupportModalState {
	closeModal: () => void;
	isOpen: boolean;
	openModal: () => void;
}

export const useSupportModalStore = create<SupportModalState>((set) => ({
	closeModal: () => {
		set({ isOpen: false });
	},
	isOpen: false,
	openModal: () => {
		set({ isOpen: true });
	},
}));
