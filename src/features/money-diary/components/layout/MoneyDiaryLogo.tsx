type MoneyDiaryLogoProps = {
  className?: string;
};

export function MoneyDiaryLogo({ className = "" }: MoneyDiaryLogoProps) {
  return (
    <img
      src="/favicon.svg"
      className={`money-brand-logo ${className}`.trim()}
      alt=""
      aria-hidden="true"
    />
  );
}
