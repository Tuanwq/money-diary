export type HubDailyRewardEntry = {
  createdAt: string;
  date: string;
  id: string;
  isWellDone: boolean;
  order: number;
  hubType: string;
};

export function allocateHubDailyRewards(
  entries: HubDailyRewardEntry[],
  getReward: (date: string, totalOrders: number) => number,
  isEligibleForDailyReward: (entry: HubDailyRewardEntry) => boolean = () =>
    true
) {
  const allocations = new Map<string, number>();
  const entriesByDate = new Map<string, HubDailyRewardEntry[]>();

  entries.forEach((entry) => {
    const dateEntries = entriesByDate.get(entry.date) ?? [];
    dateEntries.push(entry);
    entriesByDate.set(entry.date, dateEntries);
  });

  entriesByDate.forEach((dateEntries) => {
    const firstEntry = dateEntries[0];
    if (!firstEntry) return;

    const rewardScopeEntries = dateEntries.filter(isEligibleForDailyReward);
    const eligibleEntries = rewardScopeEntries
      .filter((entry) => entry.isWellDone)
      .sort((a, b) => {
        return (
          a.createdAt.localeCompare(b.createdAt) ||
          a.id.localeCompare(b.id)
        );
      });
    const totalOrders = rewardScopeEntries.reduce(
      (total, entry) => total + Math.max(entry.order, 0),
      0
    );
    const reward =
      eligibleEntries.length > 0
        ? getReward(firstEntry.date, totalOrders)
        : 0;
    const eligibleOrderTotal = eligibleEntries.reduce(
      (total, entry) => total + Math.max(entry.order, 0),
      0
    );
    let allocated = 0;

    eligibleEntries.forEach((entry, index) => {
      const isLast = index === eligibleEntries.length - 1;
      const share = isLast
        ? reward - allocated
        : eligibleOrderTotal > 0
          ? Math.floor(
              (reward * Math.max(entry.order, 0)) / eligibleOrderTotal
            )
          : 0;

      allocations.set(entry.id, share);
      allocated += share;
    });
  });

  return allocations;
}
