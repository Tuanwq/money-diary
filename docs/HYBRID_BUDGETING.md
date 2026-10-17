# Dashboard · Hũ chi tiêu · Sổ tài khoản

## Nguồn dữ liệu và công thức

Sổ tài khoản (`money_diary_account_ledgers.accounts` và `transactions`) giữ số dư thực. `jars` là kế hoạch, `jar_activities` là lịch sử dành/giải phóng tiền; chúng không tạo tài sản hoặc giao dịch thu/chi. Khoản chi từ hũ ghi **một** account transaction có `jarId` và `jarActivityId`. Chuyển nội bộ chỉ chuyển vị trí tiền. Hũ không được cộng vào tổng số dư.

`getFinancialPosition` là read model chung cho Dashboard, Hũ và Sổ tài khoản. Theo từng tài khoản: `thực có = max(0, số dư - tiền đang ở ngoài)`, `đã dành = tổng nguồn còn lại của hũ`, `chưa dành = thực có - đã dành`; chỉ tài khoản được đánh dấu `eligible` mới có khả năng phân bổ thêm. Dashboard tiếp tục dùng công thức tiền thực có của Sổ tài khoản (`max(0, tổng số dư - tổng tiền ở ngoài)`), nên số âm ở một tài khoản không bị che bởi việc cộng riêng từng `max(0, …)`. Chênh lệch trên từng tài khoản vẫn được cảnh báo.

Mỗi hũ có hai lớp độc lập:

- **Ngân sách theo kỳ:** `limitAmount`, `budgetPeriod`, chi tiêu ròng từ giao dịch đã liên kết trong kỳ, ngân sách còn lại và phần vượt. `monthly` tính theo tháng đang xem; `custom` dùng `startDate`/`endDate`. Hoàn tiền từ hũ đảo chiều chi tiêu, không phải thu nhập mới.
- **Tiền thực đã dành:** nguồn theo tài khoản trong `jar_activities`, trừ chi tiêu, cộng hoàn tiền. Giải phóng hoặc chuyển giữa hũ không thay đổi số dư tài khoản. Thanh tiến độ tiền còn giữ lấy phần còn lại trên tổng tiền đã dành ròng cho hũ, không dùng hạn mức ngân sách làm mẫu số.

`assertReservationCoverageAfterLedgerChange` kiểm tra mọi lần sửa Sổ tài khoản và thao tác hũ. Giao dịch mới, chỉnh sửa, xóa, thay đổi số dư đầu kỳ hoặc chuyển nội bộ không được làm tăng phần thiếu của hũ trên tài khoản nguồn. Dữ liệu lịch sử đã thiếu vẫn đọc được để sửa. Khôi phục backup toàn bộ aggregate là ngoại lệ có chủ đích; backup có thể chứa trạng thái lịch sử cần đối soát.

## Chuyển đổi an toàn

Không cần thay đổi SQL: bảng đã có bốn cột JSONB trên cùng một hàng theo `user_id` và RLS `auth.uid() = user_id`. Các field mới là **cộng thêm** trong JSONB. Không viết lại hay xóa record cũ.

- Hũ cũ không có `budgetPeriod` được đọc dưới dạng `legacy_total`; cách tính hạn mức toàn kỳ và phân bổ cũ được giữ. UI nhắc người dùng tự chọn kỳ nếu muốn đổi sang ngân sách tháng. Không suy từ hạn mức ra tiền thực đã dành.
- `ExpenseBudget` cũ tiếp tục được chuyển thành hũ bằng ID xác định `legacy-budget:{id}`; chạy lại không tạo trùng. Hũ từ nguồn này có kỳ `monthly`; không có allocation tự sinh. Khi đăng nhập cloud, chỉ ngân sách lấy từ snapshot server thuộc đúng `user_id` được dùng cho bước này; bộ nhớ V1 trên thiết bị không có owner nên không được tự chuyển sang tài khoản mới. Ngân sách cũ chỉ có trên máy vẫn nằm trong backup/V1 để người dùng đối chiếu trước khi nhập.
- Tài khoản cũ không có `budgetEligibility` được coi là `needs_review`, không tự động đủ điều kiện dành tiền mới. Số dư và phần tiền đã dành hiện có vẫn hiển thị. Tài khoản mới cũng cần chọn trong form.
- Cache local của sổ được tách theo `userId`. Cache không gắn người dùng từ phiên bản cũ chỉ tự nhận lại khi có marker pending mang đúng `userId`; bản không rõ chủ được giữ nguyên trên thiết bị, không tự tải lên tài khoản khác. Nếu tài khoản hiện tại chưa có sổ cloud hay thay đổi riêng, Sổ tài khoản hiển thị nút khôi phục thủ công với số lượng bản ghi và yêu cầu xác nhận chủ sở hữu; bản gốc local vẫn giữ nguyên. Dữ liệu cloud của từng người vẫn được đọc theo RLS và CAS `updated_at`.

Trước rollout, xuất backup hiện có của người dùng và giữ nguyên bảng `money_diary_account_ledgers`. Không cần chạy `supabase db push` cho thay đổi này. Để rollback mã, khôi phục phiên bản trước và backup tương ứng; tránh ghi từ client cũ vào hũ đã được đổi sang kỳ ngân sách mới vì client cũ diễn giải `limitAmount` theo toàn kỳ. Các field mới và bản local cũ vẫn tồn tại để khôi phục về phiên bản mới. Không drop cột hoặc xóa hũ legacy.

## Kiểm tra sau triển khai

Chạy `npm run build`, `npm run lint`, `npm run test:spending-jars`, `npm run test:account-ledger`, `npm run test:dashboard`, `npm run test:main-goal`, `npm run test:reporting-history`. So sánh tổng số dư trước/sau tạo hũ, đặt hạn mức, dành/giải phóng tiền và chuyển nội bộ: phải bằng nhau. Sau khoản chi từ hũ, tổng số dư chỉ giảm đúng số tiền chi. Kiểm tra cùng một người trên hai thiết bị, sau đó đăng nhập người khác trên thiết bị cũ: cache không được tự xuất hiện hoặc tự upload vào người mới.

Chưa có sổ nợ/tài sản khác nên không gọi tổng số dư là “tài sản ròng”. Hoàn tiền hiện chọn thủ công loại khoản chi gốc có ảnh hưởng mục tiêu hay không; khi hoàn tiền rơi vào kỳ khác, báo cáo kỳ nhận tiền ghi đảo chiều chi tiêu tại ngày hoàn. Cần liên kết hoàn tiền với giao dịch gốc nếu muốn điều chỉnh lại phân tích theo danh mục/kỳ của giao dịch ban đầu.
