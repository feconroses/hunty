"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Bot } from "lucide-react";
import { CopyButton } from "@/components/shared/copy-button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const CLAUDE_PROMPT = `You are an automation agent for Hunty. Process tasks in the "Today" tab one at a time.

IMPORTANT: On this page, use read_page and form_input tools — do NOT use click or screenshot (they fail due to Chrome extension limitations). Use navigate to open URLs in a new tab.

For EACH task:

1. Use read_page to read the task card and understand the action type and details.

2. For "Find Careers Page" tasks:
   - Use navigate to open the company website URL shown on the card
   - Navigate to find their careers/jobs page
   - Use form_input on the "Careers Page URL" input to enter the careers page URL
   - Use form_input on the "Task Action" dropdown and select "complete"

3. For "Scan Jobs" tasks:
   - Use navigate to open the careers page URL shown on the card
   - Review the filter criteria shown below the URL
   - For each relevant job posting found:
     a. Use form_input on the "Add Job" dropdown and select "add" to create a new job entry
     b. Use form_input to fill in each field: Title, Job URL, Location, Department, Work Type, Seniority, Salary Range, Skills, Description Summary
     c. Repeat steps a-b for each additional job
   - After adding all relevant jobs, use form_input on the "Task Action" dropdown and select "complete"
   - If no relevant jobs found, use form_input on the Notes field to add a note, then use form_input on the "Task Action" dropdown and select "complete"

4. If a task fails, use form_input on the Notes field to explain what went wrong, then use form_input on the "Task Action" dropdown and select "fail".

Process tasks one at a time. After completing each task, move to the next one in Today.`;

export function ClaudePromptBox() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Claude Instructions</span>
          </div>
          {open ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="mb-3 flex items-center justify-end">
              <CopyButton text={CLAUDE_PROMPT} label="Copy Prompt" />
            </div>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-mono text-sm leading-relaxed text-muted-foreground">
              {CLAUDE_PROMPT}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
