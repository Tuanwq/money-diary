import type { Dispatch, SetStateAction } from "react";
import type { Mood } from "../../../../types";
import type { HubType, StreakDayStatus } from "../../../../types/hub";

export type HubTab = "add" | "calculator" | "dashboard" | "list" | "settings";

export type HubJoinForm = {
  id: string;
  type: string;
  quantity: string;
  price: string;
};

export type HubForm = {
  date: string;
  hubType: HubType;
  shiftName: string;
  order: string;
  joins: HubJoinForm[];
  isWellDone: boolean;
  isHubShort: boolean;
  extraIncome: string;
  receivedMoney: string;
  bonusMoney: string;
  mood: Mood;
  diary: string;
  note: string;
};

export type HubFormSetter = Dispatch<SetStateAction<HubForm>>;

export type HubCalculatorForm = {
  date: string;
  negativeWallet: string;
  target: string;
};

export type HubCalculatorTotals = {
  totalIncome: number;
  excludedExtraIncome: number;
  excludedJoinReward: number;
  excludedSundayReward: number;
  excludedRegionReward: number;
  excludedTotal: number;
  eligibleIncome: number;
  negativeWallet: number;
  walletDebt: number;
  target: number;
  afterWalletDebt: number;
  remainingToTarget: number;
  overTarget: number;
};

export type HubTypeFilter = "ALL" | HubType;

export type HubTimeFilter =
  | "last3"
  | "today"
  | "previousWeek"
  | "thisWeek"
  | "thisMonth"
  | "previousMonth"
  | "custom";

export type HubCalendarDay = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  hasEntry: boolean;
  streakStatus?: StreakDayStatus;
};

export type HubFilteredSummary = {
  income: number;
  orders: number;
  joins: number;
  singles: number;
  hours: number;
};

export type HubStatisticsRange =
  | "last7"
  | "last14"
  | "last30"
  | "thisMonth"
  | "custom";

export type HubIncomePreview = {
  basePrice: number;
  singleOrderIncome: number;
  joinOrderIncome: number;
  extraOrderReward: number;
  extraJoinOrderReward: number;
  sundayReward: number;
  weekdayRegionReward: number;
  workIncome: number;
  joinDifference: number;
  extraIncome: number;
  total: number;
};
