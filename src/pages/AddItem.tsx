import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, Category, PRIORITIES, Priority, STATUSES, Status } from "@/lib/types";
import { fileToDataUrl, useShelf } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AddItem() {
  const nav = useNavigate();
  const { add } = useShelf();
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<Status>("saved");
  const [reminderDate, setReminderDate] = useState("");

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const url = await fileToDataUrl(f);
    setImage(url);
  };

  const save = () => {
    if (!image) return toast.error("Add a screenshot first");
    if (!category) return toast.error("Pick a category");
    add({
      image, title: title.trim(), notes: notes.trim() || undefined,
      link: link.trim() || undefined, category, priority, status,
      reminderDate: reminderDate || undefined,
    });
    toast.success("Saved to your shelf ✨");
    nav("/");
  };

  return (
    <div className="px-4 pt-5 pb-6 space-y-5">
      <header className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-semibold">New screenshot</h1>
        <div className="w-9" />
      </header>

      {/* Image dropzone */}
      <label className={cn(
        "block rounded-2xl border-2 border-dashed border-border bg-card overflow-hidden cursor-pointer hover:border-primary transition",
        image ? "p-0" : "p-8"
      )}>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => onFile(e.target.files?.[0])}
        />
        {image ? (
          <img src={image} alt="Preview" className="w-full h-auto" />
        ) : (
          <div className="flex flex-col items-center text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-3">
              <ImagePlus className="h-7 w-7" />
            </div>
            <p className="font-semibold text-foreground">Upload screenshot</p>
            <p className="text-xs mt-1">PNG or JPG from your device</p>
          </div>
        )}
      </label>

      {/* Question */}
      <div>
        <p className="font-display text-lg font-semibold mb-3">What is this?</p>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(c => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "rounded-2xl px-3 py-3 text-left text-sm font-medium transition border",
                  active ? cn(c.tw, "border-transparent ring-2 ring-primary") : "bg-card border-border hover:border-primary/40"
                )}
              >
                <span className="text-lg mr-1.5">{c.emoji}</span>{c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Thai Diner" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why did you save this?" className="mt-1.5" rows={3} />
        </div>
        <div>
          <Label htmlFor="link">Link (optional)</Label>
          <Input id="link" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" className="mt-1.5" />
        </div>

        <div>
          <Label>Priority</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {PRIORITIES.map(p => {
              const active = priority === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    "rounded-xl py-2 text-sm font-medium border transition",
                    active ? cn(p.tw, "border-transparent ring-2 ring-primary") : "bg-card border-border"
                  )}
                >{p.label}</button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Status</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {STATUSES.map(s => {
              const active = status === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    "rounded-xl py-2 text-sm font-medium border transition",
                    active ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border"
                  )}
                >{s.label}</button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="reminder">Reminder date (optional)</Label>
          <Input id="reminder" type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="mt-1.5" />
        </div>
      </div>

      <Button onClick={save} className="w-full h-12 rounded-full text-base font-semibold shadow-pop">
        <Check className="h-5 w-5 mr-1" /> Save to shelf
      </Button>
    </div>
  );
}
