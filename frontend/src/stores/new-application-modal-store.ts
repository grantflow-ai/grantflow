import { create } from "zustand";

interface NewApplicationModalState {
	closeModal: () => void;
	isModalOpen: boolean;
	openModal: () => void;
}

export const useNewApplicationModalStore = create<NewApplicationModalState>((set) => ({
	closeModal: () => {
		set({ isModalOpen: false });
	},
	isModalOpen: false,
	openModal: () => {
		set({ isModalOpen: true });
	},
}));
