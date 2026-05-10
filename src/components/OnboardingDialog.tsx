import { useEffect, useState } from "react";
import { Share2, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hasSeenOnboarding, markOnboardingSeen, onOnboardingRequested } from "@/lib/onboarding";

export default function OnboardingDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasSeenOnboarding()) setOpen(true);
    return onOnboardingRequested(() => {
      setOpen(true);
    });
  }, []);

  const close = () => {
    markOnboardingSeen();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={next => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl p-0 overflow-hidden">
        <div className="bg-gradient-soft px-5 pt-6 pb-4">
          <DialogHeader className="text-left space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-warm text-primary-foreground flex items-center justify-center shadow-pop">
              <Sparkles className="h-6 w-6" />
            </div>
            <DialogTitle className="font-display text-2xl leading-tight">
              Save from the share button
            </DialogTitle>
            <DialogDescription>
              The fastest way to use Shelf Life is from your iPhone share sheet.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <Step
            icon={<Share2 className="h-5 w-5" />}
            title="Add Shelf Life once"
            text="When viewing a screenshot, tap Share. If Shelf Life is not listed, scroll to More and add it."
          />
          <Step
            icon={<Sparkles className="h-5 w-5" />}
            title="Tap the notification"
            text="After you tap Post, iOS sends a Shelf Life notification. Tap it once to open the app and start importing. You can leave right after you open the app; it will continue categorizing."
          />
          <Step
            icon={<User className="h-5 w-5" />}
            title="Make your own categories"
            text="Press Profile to add custom categories or turn off ones you do not use."
          />
          <p className="rounded-xl bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
            The plus button is only for manual uploads.
          </p>

          <div className="flex justify-end pt-1">
            <Button onClick={close} className="rounded-full h-11 px-6">
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <p className="text-sm text-muted-foreground leading-snug mt-0.5">{text}</p>
      </div>
    </div>
  );
}
