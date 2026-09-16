# Nhật ký tài chính bằng ảnh (Money Diary V1)

Tính năng nằm trên trang Home, phía dưới phần chọn ngày. Nút `+` trên từng ô lịch mở form ảnh cho ngày đó; nút **Ghi ảnh** mở ngày hiện tại theo múi giờ `Asia/Ho_Chi_Minh`. Lịch có hai chế độ **Khoảnh khắc | Thực nhận**, lưu lựa chọn trên thiết bị. Bấm ô ngày mở Day Story toàn màn hình.

## Nguồn tiền và Daily Net

Form ảnh chỉ gọi `saveTransaction` của Account Ledger hiện tại. Giao dịch có `source: "photo_finance"` và `occurredAt`; ảnh chỉ là attachment có `sourceType: "account_transaction"`, `sourceId` là ID giao dịch. Form không ghi thêm DailyEntry hoặc ExpenseEntry. Nếu upload ảnh lỗi, giao dịch giữ nguyên ID và nút **Tải ảnh lại** chỉ upload ảnh; giao dịch không được tạo lần hai.

Daily Net trong lịch = thu nhập − chi tiêu. Projection cộng DailyEntry và ExpenseEntry V1 với **chỉ** các Account Ledger transaction được tạo bởi Photo Finance. Account Ledger transaction cũ không có provenance được bỏ khỏi phép cộng, vì có thể đã trùng với nhật ký V1. Transfer bị bỏ khỏi cả thu và chi. Thu nhập HUB hiện vào lịch qua DailyEntry mà HUB đang ghi; quy tắc streak HUB không thay đổi. Phần này chưa phải cutover toàn bộ báo cáo V1 sang Account Ledger: các record legacy thiếu source reference chưa thể tự khử trùng chính xác.

Ngày của giao dịch ảnh được lưu theo lịch Việt Nam. Các phép nhóm dùng ngày đã lưu, không cắt `createdAt` theo UTC. Lịch xếp cover trước rồi theo thời gian, tối đa ba thumbnail và badge `+N`. Day Story hiển thị carousel ảnh, timeline gồm cả giao dịch ảnh chưa upload thành công và các khoản V1 không có ảnh. Sửa/xóa Account Ledger transaction sẽ tính lại lịch; xóa ảnh không xóa giao dịch.

## Storage và database

Migration [202609160001_create_photo_finance_attachments.sql](../supabase/migrations/202609160001_create_photo_finance_attachments.sql) tạo bảng `money_diary_financial_attachments`, index owner/source, RLS theo `auth.uid()`, private bucket `money-diary-financial-photos` và policy theo prefix `{ownerId}/`. Ảnh được decode, resize, nén thành JPEG hiển thị tối đa 1600px và thumbnail tối đa 320px trước upload. Database chỉ lưu đường dẫn/dimensions/metadata, không lưu base64 hay public URL. UI xin signed URL một giờ và tự làm mới; nếu URL hết hạn người dùng có thể bấm thử lại.

Xóa ảnh đánh dấu `deleted_at` trước, sau đó dọn cả display và thumbnail. Nếu Storage tạm lỗi, ảnh không còn xuất hiện và lần refresh sau thử dọn tiếp. Xóa giao dịch dọn các ảnh liên kết trước khi xóa số tiền khỏi Account Ledger. Ảnh gốc không bị vẽ chữ/số lên pixel; overlay được render riêng.

## Cấu hình local và tình trạng migration

Ứng dụng dùng `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`. Để lưu ảnh riêng tư trong bản chạy local, đăng nhập và bật `VITE_ENABLE_LOCAL_CLOUD_SYNC=true` trong `.env.local`, sau đó chạy migration trên Supabase project tương ứng. Nếu chưa bật cloud sync, lịch vẫn hiển thị dữ liệu V1 nhưng form upload bị khóa để không tạo attachment cloud trỏ vào giao dịch chỉ tồn tại trên thiết bị.

**Chưa áp migration tự động lên Supabase linked preview.** `supabase db push --dry-run` bị chặn do remote còn 15 migration V2 mà checkout V1 đã rollback không có. Không sửa migration history và không khôi phục V2 chỉ để vượt chặn này. Có thể áp riêng file SQL trong Supabase SQL Editor của project muốn dùng, hoặc đồng bộ migration history bằng quy trình quản trị database được phê duyệt. Trước khi áp, kiểm tra project và backup dữ liệu hiện có.

## Kiểm tra

`npm run test:photo-finance` kiểm tra Daily Net, transfer, HUB legacy income, provenance tránh double count, múi giờ Việt Nam, thứ tự cover, giới hạn ba ảnh, badge và ảnh đi theo giao dịch khi sửa/xóa. `npm run test:account-ledger`, `npm run test:money-streak`, `npm run test:pwa`, `npm run test:streak`, `npm run build`, `npm run lint` là các kiểm tra hồi quy. Không sửa DayMark.
