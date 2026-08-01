import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: { previous_content: string; edited_at: string }[];
  currentContent: string | null;
  loading: boolean;
}

export function EditHistoryDialog({ open, onOpenChange, history, currentContent, loading }: EditHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>এডিট ইতিহাস</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">লোড হচ্ছে...</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">আগের কোনো ভার্সন নেই।</p>
            )}
            {history.map((h, i) => (
              <div key={i} className="bg-muted/40 border border-border rounded-lg p-3">
                <p className="text-micro text-muted-foreground mb-1">
                  {new Date(h.edited_at).toLocaleString("bn-BD")}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{h.previous_content}</p>
              </div>
            ))}
            {currentContent !== null && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-micro text-primary mb-1">বর্তমান ভার্সন</p>
                <p className="text-sm whitespace-pre-wrap break-words">{currentContent}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
