import type { HubSettings, HubType } from "../types/hub";

export const STORAGE_HUB_ENTRIES_KEY = "money-diary-hub-entries";
export const STORAGE_HUB_SETTINGS_KEY = "money-diary-hub-settings";
export const STORAGE_HUB_CALCULATOR_KEY = "money-diary-hub-calculator";
export const STORAGE_HUB_CHANGE_LOGS_KEY = "money-diary-hub-change-logs";
export const HUB_INITIAL_TAB_SESSION_KEY = "money-diary-hub-initial-tab";

export const HUB_TYPE_LABEL: Record<HubType, string> = {
  HUB_10: "Hub 10",
  HUB_8: "Hub 8",
  HUB_5: "Hub 5",
  HUB_3: "Hub 3",
  HUB_1: "Hub 1",
};

export const HUB_TYPES: HubType[] = [
  "HUB_1",
  "HUB_3",
  "HUB_5",
  "HUB_8",
  "HUB_10",
];

export const HUB_SHIFT_OPTIONS_BY_TYPE: Record<HubType, string[]> = {
  HUB_1: [
    "10:55 - 12:00",
    "12:00 - 13:00",
    "16:55 - 17:55",
    "17:55 - 19:00",
    "19:00 - 20:00",
  ],
  HUB_3: [
    "00:00 - 03:00",
    "03:05 - 06:05",
    "06:55 - 09:55",
    "10:00 - 13:00",
    "16:00 - 19:00",
    "17:55 - 21:00",
    "20:05 - 23:05",
    "20:55 - 23:55",
  ],
  HUB_5: [
    "05:30 - 10:30",
    "08:00 - 13:00",
    "10:30 - 15:30",
    "13:00 - 18:00",
    "16:00 - 21:00",
    "17:55 - 23:00",
  ],
  HUB_8: ["10:55 - 19:00"],
  HUB_10: ["10:00 - 20:00"],
};

export const DEFAULT_JOIN_PRICES: Record<number, number> = {
  2: 20900,
  3: 31135,
  4: 40000,
  5: 50000,
};

export const DEFAULT_HUB_SETTINGS: HubSettings = {
  orderPrice: 13500,
  join2Price: 20900,
  join3Price: 31135,
  join4Price: 40000,
  join5Price: 50000,
  hubShortPrice: 9000,
  includeExtraOrderReward: true,
  includeSundayReward: true,
  streakRestoredDates: [],
};

export const HANOI_EXTRA_ORDER_REWARD: Record<
  HubType,
  Array<[number, number | null, number]>
> = {
  HUB_10: [
    [31, 35, 6000],
    [35, null, 8000],
  ],
  HUB_8: [
    [26, 29, 4000],
    [30, null, 8000],
  ],
  HUB_5: [
    [14, 24, 4000],
    [25, null, 6000],
  ],
  HUB_3: [
    [7, 14, 2000],
    [15, null, 3000],
  ],
  HUB_1: [],
};

export const HANOI_JOIN_EXTRA_ORDER_REWARD: Record<
  HubType,
  Array<[number, number | null, number]>
> = {
  HUB_10: [
    [18, 22, 4000],
    [23, null, 6000],
  ],
  HUB_8: [
    [15, 19, 4000],
    [20, null, 6000],
  ],
  HUB_5: [
    [9, 13, 3000],
    [14, null, 5000],
  ],
  HUB_3: [
    [5, 8, 1000],
    [9, null, 3000],
  ],
  HUB_1: [],
};

export const HANOI_SUNDAY_ORDER_REWARD: Array<
  [number, number | null, number]
> = [
  [20, 29, 50000],
  [30, 39, 70000],
  [40, 49, 100000],
  [50, null, 150000],
];

export const HANOI_WEEKDAY_REGION_REWARD: Array<
  [number, number | null, number]
> = [
  [20, 29, 30000],
  [30, 39, 50000],
  [40, 49, 70000],
  [50, null, 90000],
];
