import { ArrowLeft, ArrowRight, Camera, Images } from "lucide-react";
import type {
  AccountTransaction,
  FinancialAccount,
  TransactionCategory,
} from "../../account-ledger/accountLedgerModel.ts";
import type { CategoryCommand } from "../../account-ledger/transactionCategories.ts";
import type { DailyEntry, ExpenseEntry } from "../../../types.ts";
import type { JarActivity, SpendingJar } from "../../spending-jars/domain/jarModel.ts";
import type { JarCommand } from "../../spending-jars/services/jarService.ts";
import { PhotoFinanceExperience } from "../components/PhotoFinanceExperience.tsx";
import "./PhotoJournalPage.css";

type PhotoJournalPageProps = {
  captureIntent: string | null;
  accounts: FinancialAccount[];
  categories: TransactionCategory[];
  onCategoryCommand: (command: CategoryCommand) => void;
  jars: SpendingJar[];
  jarActivities: JarActivity[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  ownerId?: string;
  onBack: () => void;
  onCaptureIntentConsumed: () => void;
  onDeleteTransaction: (transactionId: string) => void;
  onSaveTransaction: (transaction: AccountTransaction) => void;
  onJarCommand: (command: JarCommand) => void;
  onUploadBusyChange: (busy: boolean) => void;
  transactions: AccountTransaction[];
};

export function PhotoJournalPage({
  captureIntent,
  accounts,
  categories,
  onCategoryCommand,
  jars,
  jarActivities,
  entries,
  expenses,
  ownerId,
  onBack,
  onCaptureIntentConsumed,
  onDeleteTransaction,
  onSaveTransaction,
  onJarCommand,
  onUploadBusyChange,
  transactions,
}: PhotoJournalPageProps) {
  return (
    <div className="photo-journal-page">
      <header className="photo-journal-header">
        <button className="photo-journal-back" onClick={onBack} type="button">
          <ArrowLeft aria-hidden="true" size={18} />
          Quay lại
        </button>
        <div className="photo-journal-heading">
          <span><Images aria-hidden="true" size={16} /> Ký ức tài chính</span>
          <h1>Nhật ký tài chính</h1>
          <p>Ảnh, giao dịch và câu chuyện tiền bạc của bạn theo từng ngày.</p>
        </div>
        <div className="photo-journal-swipe-hint" aria-hidden="true">
          Vuốt sang phải để trở về <ArrowRight size={14} />
        </div>
      </header>

      <section className="photo-journal-intro" aria-label="Cách ghi nhật ký">
        <Camera aria-hidden="true" size={20} />
        <p><strong>Chạm “Ghi ảnh” hoặc dấu + trên ngày.</strong> Ảnh sẽ được gắn với giao dịch và lưu riêng tư.</p>
      </section>

      <PhotoFinanceExperience
        captureIntent={captureIntent}
        onCaptureIntentConsumed={onCaptureIntentConsumed}
        accounts={accounts}
        categories={categories}
        onCategoryCommand={onCategoryCommand}
        jars={jars}
        jarActivities={jarActivities}
        entries={entries}
        expenses={expenses}
        ownerId={ownerId}
        onDeleteTransaction={onDeleteTransaction}
        onSaveTransaction={onSaveTransaction}
        onJarCommand={onJarCommand}
        onUploadBusyChange={onUploadBusyChange}
        transactions={transactions}
      />
    </div>
  );
}
