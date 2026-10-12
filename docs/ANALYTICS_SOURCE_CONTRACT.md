# Hợp đồng số liệu Thống kê

Màn hình Thống kê phân biệt **số dư tại thời điểm hiện tại** với **dòng tiền trong khoảng ngày đang chọn**.

| Chỉ số | Nguồn và cách tính |
| --- | --- |
| Tổng số dư | Số dư mở đầu của từng tài khoản đang hoạt động cộng giao dịch sổ tài khoản; không thay đổi theo bộ lọc thời gian. |
| Có thể dùng ngay | Số dư hiện tại trừ các khoản đang ở ngoài theo cùng phép tính với trang Tổng quan. |
| Thu, chi, ròng trong kỳ | Thu từ `DailyEntry` và chi từ `ExpenseEntry` cũ, cộng các giao dịch sổ có nguồn độc lập (`photo_finance`, `spending_jar`, `manual`); ròng = thu − chi. Chuyển nội bộ chỉ được thể hiện riêng, không cộng vào thu hoặc chi. |
| Tiến độ mục tiêu chính | Dùng `buildMainGoalProgress`, cùng công thức với trang Mục tiêu: số tiền ban đầu + thu nhập hành trình − chi thường ngày ảnh hưởng mục tiêu. Phân bổ mục tiêu và chuyển nội bộ không làm giảm tiến độ. Chỉ số này là trạng thái hành trình hiện tại, không đổi theo bộ lọc Thống kê. |
| Giờ, đơn, lợi nhuận HUB | Chỉ số công việc riêng trong khu vực HUB. Không cộng lợi nhuận HUB lần nữa vào thu tài chính. |

Giao dịch sổ cũ **không có nguồn rõ ràng** chưa được cộng vào báo cáo thu–chi vì có thể trùng với Nhật ký cũ. Khối “Đối chiếu nguồn số liệu” cho biết số lượng và số tiền này, các giao dịch mới thiếu mục đích, và những khoản *có thể* trùng theo ngày, loại, số tiền, danh mục. Việc khớp này chỉ là dấu hiệu để xem lại: ứng dụng không tự loại giao dịch, không suy đoán tài khoản và không sửa dữ liệu cũ.

Các kỳ 7/30/90 ngày, tháng này, toàn bộ và tùy chỉnh áp dụng cho dòng tiền và chỉ số công việc. Số dư tài khoản và mục tiêu chính luôn được gắn nhãn là **hiện tại**. Muốn chuyển hẳn sang một nguồn giao dịch duy nhất, trước tiên cần đối chiếu và di chuyển dữ liệu legacy có khả năng trùng.
