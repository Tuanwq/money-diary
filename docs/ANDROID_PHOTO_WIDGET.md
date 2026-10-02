# Widget ảnh Money Diary trên Android

Ứng dụng Android dùng Capacitor để chạy cùng giao diện Money Diary. Widget màn hình chính dùng Android App Widgets; bản PWA trong Chrome không thể tự đăng ký widget này.

## Hiển thị và cập nhật

- Kích thước mặc định là 2×2 ô; người dùng có thể kéo rộng/cao trong launcher.
- 2×2: thumbnail ảnh giao dịch mới nhất, số tiền thu/chi/chuyển và mô tả ngắn. Khi mở rộng: thêm tên tài khoản và thời gian.
- Chạm widget mở Money Diary. Không có nút ghi giao dịch trực tiếp trên widget.
- Số tiền lấy từ transaction đã lưu. Ảnh lấy từ attachment riêng tư liên kết với transaction đó. Widget không tự tạo transaction, không lưu URL ảnh công khai và không phải một nguồn tiền mới.
- Khi mở Nhật ký tài chính, app đối chiếu ảnh và transaction đã đồng bộ để cập nhật widget. Ảnh vừa chụp được cập nhật sau khi attachment lưu thành công. Sửa/xóa ảnh hoặc giao dịch trong Nhật ký cũng làm widget chọn lại ảnh mới nhất. Đăng xuất xóa thumbnail và thông tin khỏi widget.
- Nếu chưa đăng nhập, chưa có ảnh hoặc chưa mở Nhật ký lần đầu, widget hiện trạng thái trống. Android không tự tải dữ liệu Supabase trong nền; widget hiển thị bản ghi được app đồng bộ gần nhất.

Thumbnail được tải bằng signed URL ngắn hạn qua kết nối HTTPS, rồi lưu vào `noBackupFilesDir` riêng của ứng dụng. Widget chỉ đọc bản thumbnail đã lưu; URL không được ghi xuống ổ đĩa. Dữ liệu chữ của widget được loại khỏi Android backup. Khi tải ảnh lỗi, giao diện app vẫn hoạt động và widget giữ bản đã đồng bộ gần nhất.

## Chạy trên thiết bị

1. Cài Android Studio và Android SDK theo [hướng dẫn Capacitor](https://capacitorjs.com/docs/android). Cần JDK phù hợp với Android Studio.
2. Trong thư mục `money-diary`, chạy `npm install`, rồi `npm run android:sync`.
3. Mở thư mục `android/` bằng Android Studio, chạy bản debug trên điện thoại hoặc emulator Android.
4. Đăng nhập Money Diary, mở **Nhật ký tài chính**, tạo hoặc chờ ảnh riêng tư được đồng bộ.
5. Trên màn hình chính Android, giữ chỗ trống → **Widget** → **Money Diary** → kéo widget ra màn hình. Giữ widget để đổi kích thước.

`npm run android:sync` đóng gói phiên bản web hiện tại vào app Android. Sau mỗi lần sửa giao diện web, chạy lại lệnh này trước khi build APK/AAB. `com.moneydiary.app` là application ID hiện tại; cần chốt ID này trước khi phát hành chính thức vì Android coi ID khác là ứng dụng khác.

Phần native nằm ở `android/app/src/main/java/com/moneydiary/app/LatestPhotoWidgetPlugin.java` và `LatestPhotoWidgetProvider.java`. Cầu nối web nằm ở `src/features/photo-finance/services/androidPhotoWidget.ts`.
