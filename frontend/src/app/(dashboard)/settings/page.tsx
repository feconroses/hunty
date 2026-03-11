"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/settings/profile-tab";
import { PasswordTab } from "@/components/settings/password-tab";
import { KanbanConfigTab } from "@/components/settings/kanban-config-tab";
import { AppearanceTab } from "@/components/settings/appearance-tab";
import { AccountTab } from "@/components/settings/account-tab";

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "password", label: "Password" },
  { value: "pipeline", label: "Pipeline" },
  { value: "appearance", label: "Appearance" },
  { value: "account", label: "Account" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const VALID_TABS = new Set<string>(TABS.map((t) => t.value));

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "";
  const defaultTab: TabValue = VALID_TABS.has(tabParam)
    ? (tabParam as TabValue)
    : "profile";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and preferences"
      />

      <Tabs defaultValue={defaultTab}>
        <TabsList variant="line">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>

          <TabsContent value="password">
            <PasswordTab />
          </TabsContent>

          <TabsContent value="pipeline">
            <KanbanConfigTab />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceTab />
          </TabsContent>

          <TabsContent value="account">
            <AccountTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
