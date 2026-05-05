import { useEffect, useState } from "react";
import { Bell, Check, FolderPlus, Link, Share2, Sparkles } from "lucide-react";
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
    return onOnboardingRequested(() => setOpen(true));
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
              How Screenshot Shelf works
            </DialogTitle>
            <DialogDescription>
              Save screenshots from anywhere, then let the app import, categorize, and find useful links when you open it.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <Step
            icon={<Share2 className="h-5 w-5" />}
            title="Add it to your share sheet"
            text="On your iPhone, tap the share button on a screenshot. If Screenshot Shelf is not in the app row, scroll to the end, tap More, and add it. Then choose Screenshot Shelf and tap Post."
          />
          <Step
            icon={<Bell className="h-5 w-5" />}
            title="Allow notifications"
            text="iOS may show a notification instead of opening the app automatically. Tap it once to open Screenshot Shelf and start importing."
          />
          <Step
            icon={<Sparkles className="h-5 w-5" />}
            title="You do not need to wait"
            text="iPhone does not let this work continue fully in the background. Share one screenshot or a bunch, then visit the app once. After import starts, you can leave; categorizing finishes next time the app gets time."
          />
          <Step
            icon={<FolderPlus className="h-5 w-5" />}
            title="Customize your shelves"
            text='In Profile, turn default categories on or off or add your own, like "Compliments," with guidance for what screenshots belong there.'
          />
          <Step
            icon={<Link className="h-5 w-5" />}
            title="Links are best guesses"
            text="If iOS gives us the original link, the app saves it. Otherwise the backend reads the screenshot and searches for likely source links you can check."
          />
          <Step
            icon={<Check className="h-5 w-5" />}
            title="Set reminders when needed"
            text="Open any saved item to pick a reminder date and time. Your iPhone sends a notification when it is due."
          />

          <Button onClick={close} className="w-full rounded-full h-11">
            Got it
          </Button>
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
