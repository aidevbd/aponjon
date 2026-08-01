import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
import type { DuplicateInfo } from "@/components/admin/adminContactTypes";

interface Props {
  pendingDeleteId: string | null;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  pendingDuplicate: DuplicateInfo | null;
  onCancelDuplicate: () => void;
  onConfirmDuplicate: () => void;
  showLogoutConfirm: boolean;
  onLogoutOpenChange: (open: boolean) => void;
  onConfirmLogout: () => void;
}

export function AdminConfirmDialogs({
  pendingDeleteId,
  onCancelDelete,
  onConfirmDelete,
  pendingDuplicate,
  onCancelDuplicate,
  onConfirmDuplicate,
  showLogoutConfirm,
  onLogoutOpenChange,
  onConfirmLogout,
}: Props) {
  return (
    <>
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => { if (!o) onCancelDelete(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>কন্টাক্ট ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই কন্টাক্ট স্থায়ীভাবে মুছে যাবে। এই কাজ ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              হ্যাঁ, ডিলিট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDuplicate} onOpenChange={(o) => { if (!o) onCancelDuplicate(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>এই নম্বর ইতিমধ্যে আছে</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDuplicate && (
                <>এই নম্বর ({pendingDuplicate.phone}) দিয়ে "{pendingDuplicate.existingName}" ইতিমধ্যে সংরক্ষিত আছে। বিদ্যমান কন্টাক্ট আপডেট করতে চান?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>না</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDuplicate}>হ্যাঁ, আপডেট করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLogoutConfirm} onOpenChange={onLogoutOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <LogOut className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-center">লগআউট করবেন?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              আপনি এই ডিভাইস থেকে সাইন-আউট হয়ে যাবেন। ফিরে আসতে আবার লগইন করতে হবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              লগআউট
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
