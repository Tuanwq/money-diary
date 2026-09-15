export const PHOTO_FINANCE_BUCKET = "money-diary-financial-photos";
export const PHOTO_FINANCE_SOURCE_TYPE = "account_transaction";

export type PhotoAttachment = {
  id: string;
  ownerId: string;
  sourceType: string;
  sourceId: string;
  storagePath: string;
  thumbnailPath: string;
  isCover: boolean;
  width: number;
  height: number;
  createdAt: string;
};

export type CalendarView = "moments" | "net";

export type DailyFinancialSummary = {
  date: string;
  income: number;
  expense: number;
  net: number;
  hasData: boolean;
};
