export type HubType = "HUB_10" | "HUB_8" | "HUB_5" | "HUB_3" | "HUB_1";

export type HubJoinOrder = {
  id?: string;
  type: number;
  quantity: number;
  order?: number;
  price: number;
};

export type HubEntry = {
  id: string;
  date: string;
  hubType: HubType;
  shiftName: string;
  order: number;
  joins: HubJoinOrder[];
  isWellDone: boolean;
  isHubShort: boolean;
  extraIncome: number;
  note: string;
  diaryIncomeAmount?: number;
  diaryOrderCount?: number;
  diaryWorkHours?: number;
  createdAt: string;
  updatedAt?: string;
};

export type HubSettings = {
  orderPrice: number;
  join2Price: number;
  join3Price: number;
  join4Price: number;
  join5Price: number;
  hubShortPrice: number;
  includeExtraOrderReward: boolean;
  includeSundayReward: boolean;
};

export type HubChangeAction = "create" | "update" | "delete" | "restore";

export type HubChangeLog = {
  id: string;
  action: HubChangeAction;
  entryId: string;
  date: string;
  title: string;
  description: string;
  previousEntry?: HubEntry;
  nextEntry?: HubEntry;
  createdAt: string;
};
