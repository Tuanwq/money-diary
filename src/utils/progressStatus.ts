export function isProgressBehind(
  moneyProgress: number,
  timeProgress: number,
  tolerance = 5
) {
  return moneyProgress + tolerance < timeProgress;
}
