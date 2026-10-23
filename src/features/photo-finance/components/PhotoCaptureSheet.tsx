import { usePhotoDialog } from "../hooks/usePhotoDialog.ts";
import { createPortal } from "react-dom";
import { Camera, X } from "lucide-react";
import type { AccountTransaction, FinancialAccount, TransactionCategory } from "../../account-ledger/accountLedgerModel.ts";
import type { CategoryCommand } from "../../account-ledger/transactionCategories.ts";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";
import { PhotoTransactionForm } from "./PhotoTransactionForm.tsx";
import type { PhotoAttachment } from "../types/photoFinance.ts";
import type { JarActivity, SpendingJar } from "../../spending-jars/domain/jarModel.ts";
import type { JarCommand } from "../../spending-jars/services/jarService.ts";

export function PhotoCaptureSheet({ accounts, categories, onCategoryCommand, jars, jarActivities, transactions, onJarCommand,
  existing, initialDate, isOpen, ownerId,
  repository, dayHasPhotos, onClose, onSaved, onSaveTransaction, onStartNew, onUploadBusyChange, formKey }: {
  accounts: FinancialAccount[]; existing?: AccountTransaction;
  categories: TransactionCategory[]; onCategoryCommand: (command: CategoryCommand) => void;
  jars: SpendingJar[]; jarActivities: JarActivity[]; transactions: AccountTransaction[];
  onJarCommand: (command: JarCommand) => void;
  initialDate?: string; isOpen: boolean; ownerId?: string;
  repository: ReturnType<typeof createPhotoAttachmentRepository>;
  dayHasPhotos: (date: string) => boolean;
  onClose: () => void; onSaved: (transactionId: string, date: string, attachment?: PhotoAttachment) => void;
  onSaveTransaction: (transaction: AccountTransaction) => void;
  onStartNew: () => void;
  onUploadBusyChange: (busy: boolean) => void;
  formKey: number;
}) {
  usePhotoDialog(isOpen, onClose);
  return createPortal(<div className="photo-finance-backdrop" role="presentation"
    style={isOpen ? undefined : { display: "none" }}
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section aria-modal="true" className="photo-finance-sheet" role="dialog" aria-label="Ghi khoảnh khắc tài chính">
      <header>
        <button className="photo-finance-sheet-cancel" onClick={onClose} type="button"><X size={18} /> Hủy</button>
        <span>{existing ? "Sửa khoảnh khắc" : "Khoảnh khắc mới"}</span>
        <Camera aria-hidden="true" size={20} />
      </header>
      <PhotoTransactionForm accounts={accounts} categories={categories} onCategoryCommand={onCategoryCommand} jars={jars} jarActivities={jarActivities}
        transactions={transactions} onJarCommand={onJarCommand} existing={existing} initialDate={initialDate}
        key={`${existing?.id ?? "new"}-${formKey}`} ownerId={ownerId} repository={repository}
        dayHasPhotos={dayHasPhotos}
        onSaved={onSaved} onSaveTransaction={onSaveTransaction} onStartNew={onStartNew}
        onUploadBusyChange={onUploadBusyChange} />
    </section>
  </div>, document.body);
}
