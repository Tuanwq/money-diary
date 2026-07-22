import {
  BarChart3,
  BriefcaseBusiness,
  Calculator,
  Plus,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HubTab } from "./types";

type HubNavigationProps = {
  activeTab: HubTab;
  onChange: (tab: HubTab) => void;
};

const HUB_TABS: Array<{ id: HubTab; label: string; icon: LucideIcon }> = [
  { id: "add", label: "Thêm ca", icon: Plus },
  { id: "calculator", label: "Máy tính", icon: Calculator },
  { id: "dashboard", label: "Thống kê", icon: BarChart3 },
  { id: "list", label: "Ca của tôi", icon: BriefcaseBusiness },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

export function HubNavigation({ activeTab, onChange }: HubNavigationProps) {
  return (
    <nav className="hub-navigation" aria-label="Điều hướng Hub">
      <div className="hub-navigation__track" role="tablist">
        {HUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`hub-navigation__tab${activeTab === id ? " is-active" : ""}`}
            onClick={() => onChange(id)}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
