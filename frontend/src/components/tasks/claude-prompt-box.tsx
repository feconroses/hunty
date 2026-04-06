"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Bot } from "lucide-react";
import { CopyButton } from "@/components/shared/copy-button";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";

const COWORK_PREAMBLE = `SETUP:
1. Open Google Chrome (or switch to it if already open).
2. Open a new tab and navigate to http://localhost:3000/tasks
3. Wait for the page to load completely.
4. If the page asks for login credentials, STOP and tell the user. Wait for the user to log in manually, then continue when they confirm.

`;

const TASK_INSTRUCTIONS = `You are an automation agent for Hunty. Process tasks in the "Today" tab one at a time.

TAB MANAGEMENT (CRITICAL):
- The Hunty /tasks tab MUST stay on /tasks at ALL times. NEVER use navigate on this tab — it will destroy the session and redirect to the login page.
- To open external URLs (LinkedIn, company websites, careers pages), ALWAYS use tabs_create_mcp to open them in a NEW tab.
- Use read_page and form_input on the Hunty tab for all form operations. Do NOT use click or screenshot on the Hunty tab (they fail due to Chrome extension limitations).
- IMPORTANT: Before EACH form_input on the Hunty tab, first call read_page to get fresh element references. DOM references become stale after React re-renders (e.g., after adding a job entry). Using stale references can accidentally trigger navigation and break the session.
- After you are done with an external tab, close it and return to the Hunty tab.
- The "Check URL" input and "Add Job" dropdown are near the bottom of each task card. You may need to scroll down on the Hunty tab to reach them. Use find with aria-label="Check URL" to locate the input quickly.

For EACH task:

1. Use read_page to read the task card on the Hunty tab and understand the action type and details.

2. For "Find Careers Page" tasks:
   - Use tabs_create_mcp to open the company website URL in a new tab
   - Browse to find their careers/jobs page and copy the URL
   - Return to the Hunty tab
   - Use form_input on the "Careers Page URL" input to enter the careers page URL
   - Use form_input on the "Task Action" dropdown and select "complete"
   - Close the external tab

3. For "Scan Careers Page" tasks:
   - Read the filter criteria shown on the task card. Pay attention to AND/OR logic:
     * "MUST include ALL" means every listed keyword must appear in the job
     * "MUST include at least ONE" means at least one of the listed keywords must appear
     * "must NOT include" means none of those keywords should appear in the job
   - RESUME CHECK: If the task card shows previously saved jobs (with green "Saved" badges), those jobs have already been processed. When scanning, skip any job whose URL matches a saved job and continue from where the saved jobs left off.
   - Use tabs_create_mcp to open the company careers page URL in a new tab
   - Process each job listing ONE AT A TIME. For each job:
     a. Read the job title on the external tab. If the title clearly does NOT match the filter criteria, skip it and move to the next job listing.
     b. If the title looks promising, FIRST check for duplicates using the "Check URL" input (aria-label="Check URL", placeholder "Paste job URL to check..."):
        - Copy the job URL from the listing
        - Switch to the Hunty tab, use form_input on the "Check URL" input to paste the URL
        - Wait 3 seconds, then use get_page_text or read_page to find the status message (aria-label="Check URL status"). There are exactly two possible outcomes:
          * "Duplicate — already in database. Clearing in 30s..." → This is a duplicate. The field auto-clears. Switch back to the external tab and move on.
          * "New job — not in database. Use Add Job to create an entry." → This is a new job. Proceed to step c.
        - If you see "Checking URL..." wait a bit longer and check again.
     c. If the Check URL status says "New job", go back to the external tab and read the full job description to evaluate it against the filter criteria
     d. If after reading the full description the job is NOT relevant, just move to the next job (no entry was created, nothing to remove)
     e. If the job IS relevant, switch to the Hunty tab, use form_input on the "Add Job" dropdown and select "add" to create a new entry, then fill in: Job URL, Title, Location, Department, Work Type, Seniority, Salary Range, Skills, Language Requirements, Description Summary
     f. After filling all fields, use form_input on the "Add Job" dropdown and select "add" to save the job and start the next entry. Jobs are saved automatically when you click "Add Job".
     g. Switch back to the external tab and continue to the next job listing
   - After processing all job listings, switch to the Hunty tab and use form_input on the "Task Action" dropdown and select "complete"
   - If no relevant jobs found, use form_input on the Notes field to add a note, then use form_input on the "Task Action" dropdown and select "complete"
   - Close the external tab

4. For "Scan LinkedIn" tasks:
   - Read the filter criteria shown on the task card (if any). Pay attention to AND/OR logic:
     * "MUST include ALL" means every listed keyword must appear in the job
     * "MUST include at least ONE" means at least one of the listed keywords must appear
     * "must NOT include" means none of those keywords should appear in the job
   - RESUME CHECK: If the task card shows previously saved jobs (with green "Saved" badges), those jobs have already been processed. When scanning, skip any job whose URL matches a saved job and continue from where the saved jobs left off.
   - Use tabs_create_mcp to open the LinkedIn search URL in a new tab. The URL already includes all search filters (keywords, date posted) — do NOT modify the search query or filters.
   - LOCATION CHECK: After the page loads, verify the location shown in LinkedIn's search filters matches the location specified in the task card. If the location is wrong, missing, or too broad, update it directly in LinkedIn's location filter to match the intended location before proceeding.
   - IMPORTANT: Stay on LinkedIn's AI-powered search (URL contains /jobs/search-results/). Do NOT switch to classic job search.
   - Process each job card ONE AT A TIME. For each card on the results page:
     a. Read the job title, company, and level from the card in the left panel. If the title clearly does NOT match the filter criteria (e.g., wrong seniority level), skip it immediately without opening it.
     b. If the title looks promising, FIRST check for duplicates using the "Check URL" input (aria-label="Check URL", placeholder "Paste job URL to check..."):
        - The job URL follows the pattern https://www.linkedin.com/jobs/view/{JOB_ID}. Get the job ID from the card's link.
        - Switch to the Hunty tab, use form_input on the "Check URL" input to paste the URL
        - Wait 3 seconds, then use get_page_text or read_page to find the status message (aria-label="Check URL status"). There are exactly two possible outcomes:
          * "Duplicate — already in database. Clearing in 30s..." → This is a duplicate. The field auto-clears. Switch back to the LinkedIn tab and move on.
          * "New job — not in database. Use Add Job to create an entry." → This is a new job. Proceed to step c.
        - If you see "Checking URL..." wait a bit longer and check again.
     c. If the Check URL status says "New job", NOW go back to the LinkedIn tab, click the job card, and read the full job description to evaluate it against the filter criteria
     d. If after reading the full description the job is NOT relevant, just move to the next card (no entry was created, nothing to remove)
     e. If the job IS relevant, switch to the Hunty tab, use form_input on the "Add Job" dropdown and select "add" to create a new entry, then fill in: Job URL, Company Name, Title, Location, Department, Work Type, Seniority, Salary Range, Skills, Language Requirements, Description Summary
     f. After filling all fields, use form_input on the "Add Job" dropdown and select "add" to save the job and start the next entry. Jobs are saved automatically when you click "Add Job".
     g. Switch back to the LinkedIn tab and continue to the next job card
   - PAGINATION (CRITICAL): After processing all cards on the current page, click the "Next" button or the next page number to go to the next page. Repeat until the "Next" button is NO LONGER available or clickable — that means you have reached the last page. Do NOT assume a specific number of pages. LinkedIn shows "99+ results" when there are many matches — this does NOT mean only 3-4 pages. There could be 10+ pages. You MUST keep clicking "Next" until there is no "Next" button.
   - Only after confirming there are no more pages, switch to the Hunty tab and use form_input on the "Task Action" dropdown and select "complete"
   - If no relevant jobs found, use form_input on the Notes field to add a note, then use form_input on the "Task Action" dropdown and select "complete"
   - Close the LinkedIn tab

5. If a task fails, use form_input on the Notes field to explain what went wrong, then use form_input on the "Task Action" dropdown and select "fail".

Process tasks one at a time. After completing each task, move to the next one in Today.`;

type PromptMode = "cowork" | "extension";

function getPrompt(mode: PromptMode): string {
  return mode === "cowork"
    ? COWORK_PREAMBLE + TASK_INSTRUCTIONS
    : TASK_INSTRUCTIONS;
}

export function ClaudePromptBox() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PromptMode>("cowork");

  const activePrompt = getPrompt(mode);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border bg-card">
        <div
          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer"
          onClick={() => setOpen((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-muted-foreground" />
            <span className="text-base font-medium">Claude Instructions</span>
          </div>
          <div className="flex items-center gap-1">
            <div onClick={(e) => e.stopPropagation()}>
              <CopyButton text={activePrompt} label="Copy Prompt" />
            </div>
            {open ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </div>
        </div>
        <CollapsibleContent>
          <div className="border-t border-border px-4 pb-4 pt-3">
            {/* Mode toggle */}
            <div className="mb-3 inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setMode("cowork")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  mode === "cowork"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Claude Cowork
              </button>
              <button
                type="button"
                onClick={() => setMode("extension")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  mode === "extension"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Chrome Extension
              </button>
            </div>

            <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-mono text-base leading-relaxed text-muted-foreground">
              {activePrompt}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
