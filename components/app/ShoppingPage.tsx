"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMemberProfiles, MemberProfile } from "@/app/app/household/_actions";
import { Plus } from "lucide-react";

const CATEGORIES = [
  "Dairy & Chilled",
  "Produce",
  "Bakery",
  "Meat & Fish",
  "Drinks",
  "Frozen",
  "Household",
  "Snacks",
  "Other",
];

function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function formatCategoryLabel(cat: string) {
  return cat.toUpperCase();
}

type ShoppingItem = {
  _id: Id<"shoppingItems">;
  name: string;
  category: string | null;
  quantity: string | null;
  completed: boolean;
  addedByClerkUserId: string;
  _creationTime: number;
};

function ItemRow({
  item,
  profiles,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  profiles: Map<string, MemberProfile>;
  onToggle: (id: Id<"shoppingItems">) => void;
  onRemove: (id: Id<"shoppingItems">) => void;
}) {
  const profile = profiles.get(item.addedByClerkUserId);

  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <button
        onClick={() => onToggle(item._id)}
        aria-label={item.completed ? "Mark as pending" : "Mark as bought"}
        className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
          item.completed
            ? "bg-primary border-primary"
            : "border-border bg-background"
        }`}
      >
        {item.completed && (
          <svg
            viewBox="0 0 10 8"
            className="w-3 h-3 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1 4 3.5 6.5 9 1" />
          </svg>
        )}
      </button>

      <span
        className={`flex-1 text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}
      >
        {item.name}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        {item.quantity && (
          <span className="text-xs text-muted-foreground">{item.quantity}</span>
        )}
        {profile && !item.completed && (
          <Avatar className="w-6 h-6">
            <AvatarImage src={profile.imageUrl} alt={profile.name} />
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
              {profile.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

export default function ShoppingPage() {
  const data = useQuery(api.shopping.list);
  const addMutation = useMutation(api.shopping.add);
  const toggleMutation = useMutation(api.shopping.toggle);
  const removeMutation = useMutation(api.shopping.remove);
  const clearCompletedMutation = useMutation(api.shopping.clearCompleted);

  const [inputValue, setInputValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [profiles, setProfiles] = useState<Map<string, MemberProfile>>(
    new Map(),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data?.items) return;
    const uniqueIds = [...new Set(data.items.map((i) => i.addedByClerkUserId))];
    if (uniqueIds.length === 0) return;
    getMemberProfiles(uniqueIds).then((result) => {
      if ("profiles" in result && result.profiles) {
        setProfiles(new Map(result.profiles.map((p) => [p.id, p])));
      }
    });
  }, [data?.items]);

  const handleAdd = useCallback(async () => {
    const name = inputValue.trim();
    if (!name) return;
    setInputValue("");
    setSelectedCategory(null);
    setShowCategories(false);
    await addMutation({
      name,
      category: selectedCategory ?? undefined,
    });
  }, [inputValue, selectedCategory, addMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") {
      setInputValue("");
      setSelectedCategory(null);
      setShowCategories(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-8 w-40 bg-muted rounded-lg animate-pulse" />
        <div className="h-12 bg-muted rounded-2xl animate-pulse" />
        <div className="h-48 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (data === null) return null;

  const pendingItems = data.items.filter((i) => !i.completed);
  const completedItems = data.items.filter((i) => i.completed);

  // Group pending items by category
  const categoryOrder = CATEGORIES;
  const grouped = new Map<string | null, ShoppingItem[]>();
  for (const item of pendingItems) {
    const key = item.category;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  // Sort groups: known categories first in order, then null (uncategorized)
  const sortedGroups = [
    ...categoryOrder
      .filter((c) => grouped.has(c))
      .map((c) => [c, grouped.get(c)!] as [string, ShoppingItem[]]),
    ...(grouped.has(null)
      ? [[null, grouped.get(null)!] as [null, ShoppingItem[]]]
      : []),
  ];

  const activityProfile = data.recentActivity
    ? profiles.get(data.recentActivity.addedByClerkUserId)
    : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-6 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
            Shared List
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Shopping</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.items.length} item{data.items.length !== 1 ? "s" : ""}
            {completedItems.length > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="text-primary font-medium">
                  {completedItems.length} in basket
                </span>
              </>
            )}
          </p>
        </div>
        {completedItems.length > 0 && (
          <button
            onClick={() => clearCompletedMutation()}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            Clear completed
          </button>
        )}
      </div>

      {/* Add input */}
      <div className="px-4 mb-3">
        <div className="bg-background rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3">
            <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowCategories(e.target.value.length > 0);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowCategories(inputValue.length > 0)}
              placeholder="Add item — milk, bin bags…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {showCategories && (
            <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat ? null : cat)
                  }
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity banner */}
      {data.recentActivity && (
        <div className="mx-4 mb-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2.5 flex items-center gap-3">
          <Avatar className="w-7 h-7 shrink-0">
            {activityProfile ? (
              <AvatarImage
                src={activityProfile.imageUrl}
                alt={activityProfile.name}
              />
            ) : null}
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
              {activityProfile
                ? activityProfile.name.slice(0, 2).toUpperCase()
                : "?"}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm flex-1 min-w-0">
            <span className="text-muted-foreground">
              {activityProfile?.name.split(" ")[0] ?? "Someone"} added{" "}
            </span>
            <strong className="font-semibold text-foreground">
              {data.recentActivity.itemName}
            </strong>
          </p>
          <span className="text-xs text-muted-foreground shrink-0">
            {timeAgo(data.recentActivity.addedAt)}
          </span>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6s [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
        {/* Pending items */}
        {sortedGroups.length > 0 ? (
          <div className="mx-4 bg-background rounded-2xl border border-border overflow-hidden mb-3">
            {sortedGroups.map(([category, items], groupIdx) => (
              <div key={category ?? "__uncategorized"}>
                {category && (
                  <div
                    className={`px-4 pt-3 pb-1 ${groupIdx > 0 ? "border-t border-border" : ""}`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {formatCategoryLabel(category)}
                    </span>
                  </div>
                )}
                {items.map((item, itemIdx) => (
                  <div
                    key={item._id}
                    className={
                      itemIdx < items.length - 1 ? "border-b border-border" : ""
                    }
                  >
                    <ItemRow
                      item={item}
                      profiles={profiles}
                      onToggle={(id) => toggleMutation({ id })}
                      onRemove={(id) => removeMutation({ id })}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          pendingItems.length === 0 &&
          completedItems.length === 0 && (
            <div className="mx-4 py-8 text-center text-muted-foreground text-sm">
              No items yet — add something above
            </div>
          )
        )}

        {/* Completed / In the basket */}
        {completedItems.length > 0 && (
          <div className="mx-4">
            <div className="px-0 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                In the basket · {completedItems.length}
              </span>
            </div>
            <div className="bg-background rounded-2xl border border-border overflow-hidden">
              {completedItems.map((item, idx) => (
                <div
                  key={item._id}
                  className={
                    idx < completedItems.length - 1
                      ? "border-b border-border"
                      : ""
                  }
                >
                  <ItemRow
                    item={item}
                    profiles={profiles}
                    onToggle={(id) => toggleMutation({ id })}
                    onRemove={(id) => removeMutation({ id })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
