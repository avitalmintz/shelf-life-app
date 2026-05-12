import { useEffect, useState } from "react";
import { Share2, Sparkles } from "lucide-react";
import { addCustomCategory, getCategories, setDefaultCategoryEnabled } from "@/lib/categories";
import { CATEGORIES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [showSetup, setShowSetup] = useState(false);
  const [page, setPage] = useState<"instructions" | "categories">("instructions");
  const [selected, setSelected] = useState(() => new Set(STARTER_CATEGORIES.map(c => c.id)));
  const [customName, setCustomName] = useState("");
  const [customContext, setCustomContext] = useState("");

  useEffect(() => {
    if (!hasSeenOnboarding()) {
      setShowSetup(true);
      setOpen(true);
    }
    return onOnboardingRequested(() => {
      setShowSetup(false);
      setPage("instructions");
      setOpen(true);
    });
  }, []);

  const close = () => {
    markOnboardingSeen();
    setOpen(false);
    setPage("instructions");
  };

  const toggle = (id: string) => {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finishSetup = () => {
    applyCategorySetup(selected, customName, customContext);
    close();
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
              {page === "instructions" ? "Save from the share button" : "Choose your shelf"}
            </DialogTitle>
            <DialogDescription>
              {page === "instructions"
                ? "The fastest way to use Shelf Life is from your iPhone share sheet."
                : "Pick the kinds of screenshots you want Shelf Life to recognize."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {page === "instructions" ? (
            <>
              <Step
                icon={<Share2 className="h-5 w-5" />}
                title="Add Shelf Life once"
                text="When viewing a screenshot, tap Share. If Shelf Life is not in the top app row, scroll to More and add it there so you do not have to keep scrolling."
              />
              <Step
                icon={<Sparkles className="h-5 w-5" />}
                title="Tap the notification"
                text="After you tap Post, iOS sends a Shelf Life notification. Tap it once to open the app and start importing. You can leave right after you open the app; it will continue categorizing."
              />
              <p className="rounded-xl bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
                The plus button is only for manual uploads.
              </p>
            </>
          ) : (
            <CategorySetup
              selected={selected}
              onToggle={toggle}
              customName={customName}
              setCustomName={setCustomName}
              customContext={customContext}
              setCustomContext={setCustomContext}
            />
          )}

          <div className="flex justify-end pt-1">
            <Button
              onClick={page === "instructions" && showSetup ? () => setPage("categories") : page === "categories" ? finishSetup : close}
              className="rounded-full h-11 px-6"
            >
              {page === "instructions" && showSetup ? "Choose categories" : "Got it"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const STARTER_CATEGORIES = [
  { id: "place", label: "Places", defaultValue: "place" },
  { id: "restaurants", label: "Restaurants", customContext: "Restaurants, cafes, bars, food spots, menus, reservations, and places to eat." },
  { id: "recipe", label: "Recipes", defaultValue: "recipe" },
  { id: "style", label: "Clothing", defaultValue: "style" },
  { id: "product", label: "Products to buy", defaultValue: "product" },
  { id: "read", label: "Articles", defaultValue: "read" },
  { id: "workouts", label: "Workouts", customContext: "Workout routines, fitness classes, exercises, wellness plans, and movement ideas." },
  { id: "funny", label: "Funny", customContext: "Memes, jokes, funny posts, screenshots that made me laugh, and things to send friends." },
];

function CategorySetup({
  selected,
  onToggle,
  customName,
  setCustomName,
  customContext,
  setCustomContext,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  customName: string;
  setCustomName: (value: string) => void;
  customContext: string;
  setCustomContext: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {STARTER_CATEGORIES.map(category => (
          <button
            key={category.id}
            type="button"
            onClick={() => onToggle(category.id)}
            className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
              selected.has(category.id)
                ? "border-border bg-card text-foreground"
                : "border-primary bg-primary-soft text-primary"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <Input
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          placeholder="Add your own category"
        />
        <Textarea
          value={customContext}
          onChange={e => setCustomContext(e.target.value)}
          placeholder="What should AI look for?"
          rows={2}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        You can change these anytime in Profile.
      </p>
    </div>
  );
}

function applyCategorySetup(selected: Set<string>, customName: string, customContext: string) {
  const selectedDefaults = new Set(
    STARTER_CATEGORIES
      .filter(category => selected.has(category.id) && category.defaultValue)
      .map(category => category.defaultValue as string),
  );

  CATEGORIES.forEach(category => {
    setDefaultCategoryEnabled(category.value, category.value === "other" || selectedDefaults.has(category.value));
  });

  const existingLabels = new Set(getCategories().map(category => category.label.toLowerCase()));
  STARTER_CATEGORIES
    .filter(category => selected.has(category.id) && category.customContext && !existingLabels.has(category.label.toLowerCase()))
    .forEach(category => {
      addCustomCategory({ label: category.label, context: category.customContext });
      existingLabels.add(category.label.toLowerCase());
    });

  if (customName.trim() && !existingLabels.has(customName.trim().toLowerCase())) {
    addCustomCategory({ label: customName, context: customContext });
  }
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
