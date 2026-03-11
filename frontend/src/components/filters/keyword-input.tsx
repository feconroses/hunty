"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface KeywordInputProps {
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
}

export function KeywordInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  label,
}: KeywordInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addKeyword = useCallback(
    (raw: string) => {
      const keyword = raw.trim();
      if (keyword && !value.includes(keyword)) {
        onChange([...value, keyword]);
      }
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const parts = inputValue.split(",");
        for (const part of parts) {
          addKeyword(part);
        }
        setInputValue("");
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        onChange(value.slice(0, -1));
      }
    },
    [inputValue, value, onChange, addKeyword],
  );

  const handleRemove = useCallback(
    (keyword: string) => {
      onChange(value.filter((v) => v !== keyword));
    },
    [value, onChange],
  );

  const handleBlur = useCallback(() => {
    if (inputValue.trim()) {
      const parts = inputValue.split(",");
      for (const part of parts) {
        addKeyword(part);
      }
      setInputValue("");
    }
  }, [inputValue, addKeyword]);

  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}
      <div className="flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
        {value.map((keyword) => (
          <Badge
            key={keyword}
            variant="secondary"
            className="gap-1 pr-1"
          >
            {keyword}
            <button
              type="button"
              onClick={() => handleRemove(keyword)}
              className="rounded-full p-0.5 hover:bg-muted-foreground/20"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          className="h-auto min-w-[120px] flex-1 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
