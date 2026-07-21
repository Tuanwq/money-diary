import type { ReactNode } from "react";
import type { GoalScreen, Page } from "../../../../types";
import { GoalsNavigation } from "./GoalsNavigation";

type GoalsLayoutProps = {
  activeScreen: GoalScreen;
  children: ReactNode;
  navigateTo: (page: Page, goalScreen?: GoalScreen) => void;
};

const pageCopy: Record<GoalScreen, { description: string; title: string }> = {
  menu: {
    title: "Các mục tiêu",
    description:
      "Theo dõi mục tiêu chính, những khoản dành riêng và các cột mốc tài chính của bạn.",
  },
  current: {
    title: "Mục tiêu hiện tại",
    description: "Theo dõi tiến độ, dự báo và các kịch bản cho mục tiêu chính.",
  },
  subGoals: {
    title: "Mục tiêu phụ",
    description: "Quản lý các khoản dành riêng và lịch sử góp tiền.",
  },
  balance: {
    title: "Biến động tiền",
    description: "Theo dõi số dư thực tế và tổng tiền tích lũy theo thời gian.",
  },
  completed: {
    title: "Mục tiêu đã hoàn thành",
    description: "Xem lại kết quả và hành trình của những mục tiêu đã đạt.",
  },
  completedDetail: {
    title: "Chi tiết mục tiêu đã hoàn thành",
    description: "Đối chiếu tiến độ, góp tiền, chi tiêu và nhật ký liên quan.",
  },
  milestones: {
    title: "Mốc kiểm tra",
    description: "Theo dõi các mốc 25%, 50%, 75% và 100% của mục tiêu chính.",
  },
};

export function GoalsLayout({
  activeScreen,
  children,
  navigateTo,
}: GoalsLayoutProps) {
  const copy = pageCopy[activeScreen];

  return (
    <div className="goals-layout">
      <header className="goals-layout__header">
        <div className="goals-layout__heading">
          <p className="goals-layout__eyebrow">Kế hoạch tài chính</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
      </header>

      <GoalsNavigation activeScreen={activeScreen} navigateTo={navigateTo} />

      <div className="goals-layout__content">{children}</div>
    </div>
  );
}
