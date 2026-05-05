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
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!hasSeenOnboarding()) setOpen(true);
    return onOnboardingRequested(() => {
      setPage(0);
      setOpen(true);
    });
  }, []);

  const close = () => {
    markOnboardingSeen();
    setOpen(false);
    setPage(0);
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
              {page === 0
                ? "Set up the share sheet once, then send screenshots here from anywhere."
                : "Open the app once to import, categorize, find links, and set reminders."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {page === 0 ? (
            <>
              <Step
                icon={<Share2 className="h-5 w-5" />}
                title="Add it to your share sheet"
                text="On your iPhone, tap the share button on a screenshot. If Screenshot Shelf is not in the app row, scroll to the end, tap More, and add it."
              />
              <Step
                icon={<Bell className="h-5 w-5" />}
                title="Tap Post, then open"
                text="Choose Screenshot Shelf and tap Post. If iOS shows a notification, tap it right away to open the app, or keep screenshotting and open the app later."
              />
              <Step
                icon={<Sparkles className="h-5 w-5" />}
                title="You can leave after it starts"
                text="The app starts importing when you visit it. You do not need to wait on the screen; if iOS pauses it, categorizing continues next time you open the app."
              />
            </>
          ) : (
            <>
              <Step
                icon={<FolderPlus className="h-5 w-5" />}
                title="Customize your shelves"
                text='In Profile, turn categories on or off or add your own, like "Compliments," with guidance for what belongs there.'
              />
              <Step
                icon={<Link className="h-5 w-5" />}
                title="Links are suggested"
                text="If iOS provides the original link, the app saves it. Otherwise it reads the screenshot and searches for likely source links."
              />
              <Step
                icon={<Check className="h-5 w-5" />}
                title="Set reminders"
                text="Open any saved item to pick a reminder date and time. Your iPhone sends a notification when it is due."
              />
            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex gap-1.5">
              {[0, 1].map(i => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${page === i ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            {page === 0 ? (
              <Button onClick={() => setPage(1)} className="rounded-full h-11 px-6">
                Next
              </Button>
            ) : (
              <Button onClick={close} className="rounded-full h-11 px-6">
                Got it
              </Button>
            )}
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
