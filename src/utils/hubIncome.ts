import {
  HANOI_EXTRA_ORDER_REWARD,
  HANOI_JOIN_EXTRA_ORDER_REWARD,
  HANOI_SUNDAY_ORDER_REWARD,
  HANOI_WEEKDAY_REGION_REWARD,
} from "../constants/hanoiHub";
import type { HubEntry, HubSettings } from "../types/hub";

type RewardRange = [number, number | null, number];

function getRewardFromRange(
  order: number,
  rewards: RewardRange[]
) {
  let total = 0;
  const sortedRewards = [...rewards].sort(([startA], [startB]) => {
    return startA - startB;
  });

  for (let index = 0; index < sortedRewards.length; index += 1) {
    const [start, end, price] = sortedRewards[index];
    const nextStart = sortedRewards[index + 1]?.[0];
    const rangeEnd = nextStart
      ? Math.min(end ?? Number.POSITIVE_INFINITY, nextStart - 1)
      : end;

    if (order < start) continue;

    const lastRewardedOrder =
      rangeEnd === null ? order : Math.min(order, rangeEnd);
    const count = lastRewardedOrder - start + 1;

    if (count > 0) {
      total += count * price;
    }
  }

  return total;
}

function getFlatRewardFromRange(order: number, rewards: RewardRange[]) {
  const matchedReward = [...rewards]
    .sort(([startA], [startB]) => startB - startA)
    .find(([start, end]) => {
      return order >= start && (end === null || order <= end);
    });

  return matchedReward?.[2] ?? 0;
}

function getJoinQuantity(join: HubEntry["joins"][number]) {
  return join.quantity ?? join.order ?? 0;
}

function isSunday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).getDay() === 0;
}

export function calculateHubIncome(entry: HubEntry, settings: HubSettings) {
  const joinOrderIncome = entry.joins.reduce((sum, join) => {
    return sum + getJoinQuantity(join) * join.price;
  }, 0);
  const totalJoinChildOrders = entry.joins.reduce((sum, join) => {
    return sum + getJoinQuantity(join) * join.type;
  }, 0);
  const remainingSingleOrders = Math.max(entry.order - totalJoinChildOrders, 0);
  const overusedOrderCount = Math.max(totalJoinChildOrders - entry.order, 0);

  const baseOrderPrice = entry.isHubShort
    ? settings.hubShortPrice
    : settings.orderPrice;
  const singleOrderIncome = remainingSingleOrders * baseOrderPrice;

  const basePrice = singleOrderIncome + joinOrderIncome;

  const extraOrderReward =
    entry.isWellDone && settings.includeExtraOrderReward
      ? getRewardFromRange(
          entry.order,
          HANOI_EXTRA_ORDER_REWARD[entry.hubType]
        )
      : 0;

  const extraJoinOrderReward =
    entry.isWellDone && settings.includeExtraOrderReward
      ? getRewardFromRange(
          totalJoinChildOrders,
          HANOI_JOIN_EXTRA_ORDER_REWARD[entry.hubType]
        )
      : 0;
  const sundayReward =
    entry.isWellDone && settings.includeSundayReward && isSunday(entry.date)
      ? getFlatRewardFromRange(entry.order, HANOI_SUNDAY_ORDER_REWARD)
      : 0;
  const weekdayRegionReward =
    entry.isWellDone && settings.includeSundayReward && !isSunday(entry.date)
      ? getFlatRewardFromRange(entry.order, HANOI_WEEKDAY_REGION_REWARD)
      : 0;
  const joinIncomeIfSingleOrders = totalJoinChildOrders * settings.orderPrice;
  const joinDifference = joinOrderIncome - joinIncomeIfSingleOrders;

  const total =
    singleOrderIncome +
    joinOrderIncome +
    extraOrderReward +
    extraJoinOrderReward +
    sundayReward +
    weekdayRegionReward +
    entry.extraIncome;
  const excludedFromWorkIncome =
    extraJoinOrderReward + sundayReward + weekdayRegionReward;
  const workIncome = total - excludedFromWorkIncome;

  return {
    basePrice,
    singleOrderIncome,
    joinPrice: joinOrderIncome,
    joinOrderIncome,
    totalJoinChildOrders,
    remainingSingleOrders,
    overusedOrderCount,
    extraOrderReward,
    extraJoinOrderReward,
    sundayReward,
    weekdayRegionReward,
    excludedFromWorkIncome,
    workIncome,
    joinIncomeIfSingleOrders,
    joinDifference,
    extraIncome: entry.extraIncome,
    total,
  };
}
