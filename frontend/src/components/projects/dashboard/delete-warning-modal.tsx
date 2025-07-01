'use client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  
} from '@/components/ui/alert-dialog';
import { AppButton } from '@/components/app';

interface DeleteWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteWarningModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteWarningModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white w-[464px] p-8 rounded-lg flex flex-col gap-8">
        <AlertDialogHeader className="flex flex-col gap-3">
          <h4 className="font-medium text-[26px] text-black leading-[34px]">
            Are you sure you want to delete this research project?
          </h4>
          <p className="text-base font-normal text-black">
            If the project contains applications, they will also be permanently
            deleted. This action cannot be undone.
          </p>
        </AlertDialogHeader>
        <footer className="flex justify-between w-full">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton variant="primary" onClick={onConfirm}>
            Delete
          </AppButton>
        </footer>
      </AlertDialogContent>
    </AlertDialog>
  );
}
