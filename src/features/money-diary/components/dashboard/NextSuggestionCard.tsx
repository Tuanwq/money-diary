import {
  AutopilotPanel,
  type AutopilotPanelProps,
} from "../../../../components/AutopilotPanel";
import { DashboardSectionState } from "./DashboardSectionState";

type NextSuggestionCardProps = AutopilotPanelProps & {
  isDataComplete: boolean;
  isLoading?: boolean;
};

export function NextSuggestionCard({
  isDataComplete,
  isLoading,
  ...props
}: NextSuggestionCardProps) {
  if (isLoading) {
    return (
      <section className="money-card money-next-suggestion" aria-label="Gợi ý tiếp theo">
        <DashboardSectionState isLoading variant="compact" />
      </section>
    );
  }

  if (!isDataComplete) {
    return (
      <section className="money-card money-next-suggestion" aria-labelledby="next-suggestion-empty-title">
        <div className="money-section-heading">
          <div>
            <p className="money-eyebrow">Kế hoạch tài chính</p>
            <h3 id="next-suggestion-empty-title">Gợi ý tiếp theo</h3>
          </div>
        </div>
        <div className="money-next-suggestion-empty">
          <strong>Chưa đủ dữ liệu để tạo gợi ý</strong>
          <p>Hãy hoàn thành dữ liệu ngày đang xem để kế hoạch chính xác hơn.</p>
        </div>
      </section>
    );
  }

  return <AutopilotPanel {...props} />;
}
