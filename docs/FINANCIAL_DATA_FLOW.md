# Luồng dữ liệu tài chính hiện tại

## Nguồn chuẩn cho số tiền

`useAccountLedger` giữ `AccountLedgerData` gồm tài khoản, giao dịch và hoạt động hũ. Dữ liệu lưu ở `money_diary_account_ledger` trên thiết bị và đồng bộ nguyên ledger bằng JSONB trong `money_diary_account_ledgers` trên Supabase. Đây là nguồn chuẩn **đang chạy** của số dư và biến động tài chính. Chưa có bảng transaction normalized trong repository hiện tại; không khẳng định đã chuyển sang bảng normalized.

Mỗi `AccountTransaction` có một ID. `income` tăng một tài khoản, `expense` giảm một tài khoản, `transfer` giảm tài khoản nguồn và tăng tài khoản đích. Số dư được tính từ opening balance và danh sách transaction hiện tại, nên sửa/xóa transaction sẽ tự đảo tác động cũ. Hũ `allocate`/`release` chỉ reserve tiền, không tạo thu/chi; hoạt động `spend`/`refund` liên kết transaction thực. `purpose` chỉ quyết định giao dịch ảnh hưởng tiến độ mục tiêu, không quyết định dòng tiền.
`sourceReference` là trường tùy chọn cho adapter; write path từ chối tạo hai transaction khác ID có cùng reference trên cùng ledger. Chưa có backfill hoặc ràng buộc unique ở database JSONB hiện tại.

`financialMetrics.ts` là lớp đọc chung cho tổng thu, tổng chi, chuyển tiền, dòng tiền ròng, dữ liệu theo ngày và phân loại chi tiêu. Khoảng ngày dùng chuỗi ngày địa phương `YYYY-MM-DD` lưu cùng transaction, không chuyển thành UTC rồi cắt ngày. Tổng quan, Thống kê, Lịch sử, Nhật ký tài chính và tiến độ mục tiêu đọc account transactions; các khoản chuyển nội bộ không tăng thu/chi/net. Ca HUB được tính riêng cho KPI công việc; không cộng trực tiếp vào tiền trong Thống kê.

## Legacy và phạm vi tương thích

`DailyEntry`, `ExpenseEntry`, `BalanceCheckEntry` và `HubEntry` vẫn còn trong local state/Supabase, chưa bị xóa. `DailyEntry`/`ExpenseEntry` không chỉ rõ account, nên **không thể** tự động chuyển sang transaction mà không đoán và có nguy cơ double count. Chúng hiển thị ở khu vực lịch sử cũ, không cộng vào số dư, biểu đồ tài chính và mục tiêu của Sổ tài khoản. Tổng quan và Thống kê hiển thị cảnh báo khi còn bản ghi cũ chưa đối chiếu. HUB chỉ cung cấp giờ làm, đơn, ca và lợi nhuận công việc; lịch sử ca HUB là sự kiện tham chiếu, không phải giao dịch tiền.

Để migrate từng record cũ: tạo backup trước; đối chiếu với giao dịch ledger theo ngày, số tiền, loại, tài khoản và mô tả; yêu cầu người dùng chọn tài khoản khi không thể xác định; gán source reference cố định (`legacy:daily-entry:{id}:income`, `legacy:expense:{id}:...`, `hub:{id}:...`); chỉ tạo giao dịch khi chưa tồn tại reference; kiểm tra số dư và thu/chi trước-sau; sau xác minh mới chuyển write path cũ sang read-only. Không xóa local/Supabase legacy hoặc tự ghi bù vào opening balance trong lần refactor này.

## Điểm còn cần xử lý trước khi nghỉ hưu V1

- Biểu mẫu Chốt ngày/Ghi chép, các trang Chi tiêu cũ và Kiểm kê cũ vẫn còn đường ghi legacy. Chúng được phân biệt ở Lịch sử; việc tắt cần đi cùng migration và workflow thay thế hoàn chỉnh.
- Báo cáo Word và một số màn hình legacy vẫn nhận record cũ để bảo toàn dữ liệu xuất trước đây. Không dùng báo cáo đó để đối chiếu với KPI Sổ tài khoản cho đến khi chuyển read path.
- JSONB đồng bộ nguyên ledger có giới hạn khi nhiều thiết bị sửa đồng thời. Việc chuyển sang bảng transaction normalized và migration có version/idempotency cần phase riêng, kèm cơ chế khôi phục và kiểm tra dữ liệu thực tế.

## Kiểm chứng

`npm run test:financial-metrics`, `npm run test:account-ledger`, `npm run test:dashboard`, `npm run test:main-goal`, `npm run test:photo-finance`, `npm run lint`, `npm run build`. Các case tài chính kiểm tra chuyển nội bộ không ảnh hưởng net, phân bổ hũ không phải expense, cập nhật và xóa transaction đổi tổng và số dư, lọc ngày địa phương.
