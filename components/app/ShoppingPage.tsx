"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMemberProfiles, MemberProfile } from "@/app/app/household/_actions";
import { Minus, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

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

function parseQty(value: string | null): number {
  if (!value) return 0;
  const n = parseInt(value.replace(/^x/i, ""), 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

function formatQty(n: number): string | null {
  return n > 0 ? `x${n}` : null;
}

function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums">
        {value === 0 ? "—" : value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
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
  isEditing,
  onStartEdit,
  onToggle,
  onRemove,
  onUpdate,
}: {
  item: ShoppingItem;
  profiles: Map<string, MemberProfile>;
  isEditing: boolean;
  onStartEdit: () => void;
  onToggle: (id: Id<"shoppingItems">) => void;
  onRemove: (id: Id<"shoppingItems">) => void;
  onUpdate: (
    id: Id<"shoppingItems">,
    name: string,
    category: string | null,
    quantity: string | null,
  ) => void;
}) {
  const profile = profiles.get(item.addedByClerkUserId);
  const [editName, setEditName] = useState(item.name);
  const [editCategory, setEditCategory] = useState<string | null>(item.category);
  const [editQuantity, setEditQuantity] = useState(parseQty(item.quantity));
  const editInputRef = useRef<HTMLInputElement>(null);

  // Sync edit fields when edit mode opens
  useEffect(() => {
    if (isEditing) {
      setEditName(item.name);
      setEditCategory(item.category);
      setEditQuantity(parseQty(item.quantity));
      setTimeout(() => editInputRef.current?.focus(), 0);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveEdit = () => {
    const name = editName.trim();
    if (!name) return;
    onUpdate(item._id, name, editCategory, formatQty(editQuantity));
  };

  if (isEditing) {
    return (
      <div className="px-4 py-3 flex flex-col gap-3">
        <input
          ref={editInputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") onUpdate(item._id, item.name, item.category, item.quantity);
          }}
          className="w-full text-sm font-medium bg-muted rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex gap-3 items-start">
          <div className="flex flex-col gap-1 items-start shrink-0">
            <span className="text-xs text-muted-foreground pl-1">Qty</span>
            <QuantityStepper value={editQuantity} onChange={setEditQuantity} />
          </div>
          <div className="flex gap-1 flex-wrap flex-1 pt-0.5">
            <span className="text-xs text-muted-foreground w-full mb-0.5">Category</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setEditCategory(editCategory === cat ? null : cat)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  editCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => onUpdate(item._id, item.name, item.category, item.quantity)}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveEdit}
            className="text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/80 px-3 py-1.5 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 py-3 px-4 cursor-pointer active:bg-muted/50 transition-colors"
      onClick={() => onToggle(item._id)}
    >
      <div
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
      </div>

      <span
        className={`flex-1 text-sm font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}
      >
        {item.name}
      </span>

      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Item options"
              className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onStartEdit}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onRemove(item._id)}
            >
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ItemGroup({
  category,
  items,
  profiles,
  editingId,
  onStartEdit,
  onToggle,
  onRemove,
  onUpdate,
}: {
  category: string | null;
  items: ShoppingItem[];
  profiles: Map<string, MemberProfile>;
  editingId: Id<"shoppingItems"> | null;
  onStartEdit: (id: Id<"shoppingItems">) => void;
  onToggle: (id: Id<"shoppingItems">) => void;
  onRemove: (id: Id<"shoppingItems">) => void;
  onUpdate: (
    id: Id<"shoppingItems">,
    name: string,
    category: string | null,
    quantity: string | null,
  ) => void;
}) {
  return (
    <div className="mx-4 mb-2">
      {category && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 pb-1.5">
          {category}
        </p>
      )}
      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        {items.map((item, idx) => (
          <div
            key={item._id}
            className={idx < items.length - 1 ? "border-b border-border" : ""}
          >
            <ItemRow
              item={item}
              profiles={profiles}
              isEditing={editingId === item._id}
              onStartEdit={() => onStartEdit(item._id)}
              onToggle={onToggle}
              onRemove={onRemove}
              onUpdate={(id, name, cat, qty) => {
                onUpdate(id, name, cat, qty);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShoppingPage() {
  const data = useQuery(api.shopping.list);
  const addMutation = useMutation(api.shopping.add);
  const toggleMutation = useMutation(api.shopping.toggle);
  const removeMutation = useMutation(api.shopping.remove);
  const updateMutation = useMutation(api.shopping.update);
  const clearCompletedMutation = useMutation(api.shopping.clearCompleted);

  const [inputValue, setInputValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [addQuantity, setAddQuantity] = useState(0);
  const [showCategories, setShowCategories] = useState(false);
  const [editingId, setEditingId] = useState<Id<"shoppingItems"> | null>(null);
  const [profiles, setProfiles] = useState<Map<string, MemberProfile>>(new Map());
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
    setAddQuantity(0);
    setShowCategories(false);
    await addMutation({
      name,
      category: selectedCategory ?? undefined,
      quantity: formatQty(addQuantity) ?? undefined,
    });
  }, [inputValue, selectedCategory, addQuantity, addMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") {
      setInputValue("");
      setSelectedCategory(null);
      setAddQuantity(0);
      setShowCategories(false);
    }
  };

  const handleUpdate = useCallback(
    (
      id: Id<"shoppingItems">,
      name: string,
      category: string | null,
      quantity: string | null,
    ) => {
      setEditingId(null);
      updateMutation({ id, name, category: category ?? undefined, quantity: quantity ?? undefined });
    },
    [updateMutation],
  );

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

  const grouped = new Map<string | null, ShoppingItem[]>();
  for (const item of pendingItems) {
    const key = item.category;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  const sortedGroups: [string | null, ShoppingItem[]][] = [
    ...CATEGORIES.filter((c) => grouped.has(c)).map(
      (c) => [c, grouped.get(c)!] as [string, ShoppingItem[]],
    ),
    ...(grouped.has(null) ? [[null, grouped.get(null)!] as [null, ShoppingItem[]]] : []),
  ];

  const activityProfile = data.recentActivity
    ? profiles.get(data.recentActivity.addedByClerkUserId)
    : null;

  const sharedRowProps = {
    profiles,
    editingId,
    onStartEdit: (id: Id<"shoppingItems">) => setEditingId(id),
    onToggle: (id: Id<"shoppingItems">) => toggleMutation({ id }),
    onRemove: (id: Id<"shoppingItems">) => removeMutation({ id }),
    onUpdate: handleUpdate,
  };

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
            {inputValue.trim().length > 0 && (
              <button
                onClick={handleAdd}
                className="shrink-0 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/80 px-3 py-1.5 rounded-lg transition-colors"
              >
                Add
              </button>
            )}
          </div>
          {showCategories && (
            <div className="px-4 pb-3 flex flex-col gap-2 border-t border-border">
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs text-muted-foreground shrink-0">Qty</span>
                <QuantityStepper value={addQuantity} onChange={setAddQuantity} />
              </div>
              <div className="flex gap-1.5 flex-wrap">
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
            </div>
          )}
        </div>
      </div>

      {/* Activity banner */}
      {data.recentActivity && (
        <div className="mx-4 mb-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2.5 flex items-center gap-3">
          <Avatar className="w-7 h-7 shrink-0">
            {activityProfile && (
              <AvatarImage src={activityProfile.imageUrl} alt={activityProfile.name} />
            )}
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
              {activityProfile ? activityProfile.name.slice(0, 2).toUpperCase() : "?"}
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

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {sortedGroups.length > 0 ? (
          sortedGroups.map(([category, items]) => (
            <ItemGroup
              key={category ?? "__uncategorized"}
              category={category}
              items={items}
              {...sharedRowProps}
            />
          ))
        ) : (
          completedItems.length === 0 && (
            <div className="mx-4 py-8 text-center text-muted-foreground text-sm">
              No items yet — add something above
            </div>
          )
        )}

        {/* In the basket */}
        {completedItems.length > 0 && (
          <div className="mx-4 mt-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 pb-1.5">
              In the basket · {completedItems.length}
            </p>
            <div className="bg-background rounded-2xl border border-border overflow-hidden">
              {completedItems.map((item, idx) => (
                <div
                  key={item._id}
                  className={idx < completedItems.length - 1 ? "border-b border-border" : ""}
                >
                  <ItemRow
                    item={item}
                    profiles={profiles}
                    isEditing={editingId === item._id}
                    onStartEdit={() => setEditingId(item._id)}
                    onToggle={(id) => toggleMutation({ id })}
                    onRemove={(id) => removeMutation({ id })}
                    onUpdate={handleUpdate}
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
