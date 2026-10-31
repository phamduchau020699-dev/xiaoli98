# Xiaoli98 v3 – Hướng dẫn triển khai MIỄN PHÍ (từng bước)

## 0. Bộ công cụ miễn phí
| Việc | Dịch vụ | Ghi chú |
|---|---|---|
| Chạy server | Render.com (Web Service, gói Free) | Ngủ sau ~15 phút không dùng, lần mở đầu chậm ~30–60 giây |
| Lưu dữ liệu bền | MongoDB Atlas (cụm M0 Free) | Dung lượng nhỏ (khoảng 512 MB), đủ cho nhóm vài trăm người dùng |
| Gọi điện khác mạng | Metered.ca Open Relay (TURN) hoặc dịch vụ tương tự | Có hạn mức miễn phí, bạn xem hạn mức hiện tại khi đăng ký |
| Thông báo đẩy | Web Push (có sẵn trong code) | Không cần Firebase, khóa tự sinh |
| Giữ server không ngủ | UptimeRobot (gói Free) | Ping `https://TEN-APP.onrender.com/healthz` mỗi 5 phút |

Các giới hạn gói free có thể đã đổi, hãy đọc lại trang giá của từng dịch vụ trước khi dùng thật.

## 1. Chạy thử trên máy (5 phút)
    npm install
    npm test          # 13 test, phải đạt hết
    npm start         # mở http://localhost:3000
Không có `MONGODB_URI` thì dữ liệu lưu ở `data/db.json` (chỉ để thử).

## 2. Tạo MongoDB Atlas miễn phí
1. Vào mongodb.com/atlas, đăng ký, tạo cụm **M0 (Free)**, chọn khu vực gần Việt Nam (Singapore).
2. Database Access: tạo user + mật khẩu (nên dùng mật khẩu chỉ gồm chữ và số).
3. Network Access: thêm `0.0.0.0/0` (cho phép Render kết nối).
4. Connect > Drivers: copy chuỗi dạng `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/`.
5. Kiểm tra trên máy: `MONGODB_URI="chuỗi-của-bạn" npm run check-db` phải in **KẾT NỐI OK**.
Lưu ý: tôi chưa kiểm thử được với Atlas thật (chỉ kiểm thử bản lưu file), nên bước `check-db` này rất quan trọng. Nếu lỗi, gửi lại thông báo lỗi cho tôi.

## 3. Đưa lên Render
1. Tạo tài khoản GitHub, tạo repo mới, tải toàn bộ thư mục `Xiaoli98` lên (không tải `node_modules`).
2. Render.com > New > **Blueprint** > chọn repo (file `render.yaml` đã cấu hình sẵn), hoặc New > Web Service: Build `npm install`, Start `npm start`, Plan Free.
3. Mục Environment, điền: `MONGODB_URI` (bước 2), `SECRET` (tự sinh nếu dùng Blueprint).
4. Sau khi deploy xong bạn có link `https://xiaoli98-xxxx.onrender.com`. Mở trên điện thoại, đăng ký 2 tài khoản để thử.
5. Đăng ký UptimeRobot, tạo monitor HTTP(s) tới `/healthz` mỗi 5 phút để server ít bị ngủ.

## 4. Bật gọi thoại/video ổn định (TURN)
1. Đăng ký Metered.ca, lấy thông tin TURN (URL, username, credential).
2. Thêm 3 biến trên Render: `TURN_URL` (nhiều URL cách nhau bằng dấu phẩy, ví dụ `turn:HOST:80,turns:HOST:443`), `TURN_USER`, `TURN_CRED`. Render sẽ tự deploy lại.
3. Thử gọi giữa 2 điện thoại khác mạng (một máy dùng 4G, một máy dùng Wi-Fi).

## 5. Cài như app + thông báo
- **Android (Chrome):** mở link, menu ⋮ > Cài đặt ứng dụng. Vào Tôi > Bật thông báo.
- **iPhone (Safari):** nút Chia sẻ > Thêm vào Màn hình chính, mở app từ biểu tượng đó rồi vào Tôi > Bật thông báo (cần iOS 16.4 trở lên).
Cách này **hoàn toàn miễn phí**, không cần tài khoản cửa hàng. Mọi người có thể dùng ngay bằng cách gửi link.

## 6. Đăng lên Google Play (chi phí 25 USD một lần)
App web này đóng gói bằng **PWABuilder** (pwabuilder.com), miễn phí, ra gói Android dùng Chrome nên thông báo đẩy vẫn chạy:
1. Vào pwabuilder.com, dán link Render, bấm Start. Điểm manifest/service worker đã sẵn sàng.
2. Package for stores > Android > tạo gói `.aab`. Tải về, giữ file khóa ký (signing key) cẩn thận.
3. PWABuilder cho bạn nội dung `assetlinks.json`: dán vào file `public/.well-known/assetlinks.json` rồi đưa lên GitHub để Render deploy lại (bước này giúp app chạy toàn màn hình, không hiện thanh địa chỉ).
4. Tạo tài khoản Google Play Console (25 USD), tạo app, tải `.aab` lên.
5. Hồ sơ cửa hàng cần: URL chính sách quyền riêng tư `https://LINK/privacy.html` (đã điền sẵn email liên hệ), URL hướng dẫn xóa tài khoản `https://LINK/delete-account.html`, mục Data safety khai báo (tên, tin nhắn, ảnh, micro/camera), ảnh chụp màn hình, mô tả.
6. Tài khoản cá nhân mới thường phải chạy thử nghiệm kín với một số lượng người thử tối thiểu trong khoảng 2 tuần trước khi phát hành chính thức. Bạn kiểm tra yêu cầu hiện tại trong Play Console vì chính sách này có thể thay đổi.

## 7. Đăng lên App Store (99 USD mỗi năm, cần máy Mac)
- Apple thường từ chối app chỉ bọc lại trang web (nguyên tắc 4.2). PWABuilder có tạo dự án Xcode, nhưng khả năng được duyệt thấp nếu không có thêm tính năng gốc.
- Lựa chọn miễn phí tốt nhất cho iPhone là mục 5 (thêm vào Màn hình chính).
- Nếu vẫn muốn lên App Store, bạn cần bọc bằng Capacitor và thêm push notification gốc (APNs), việc này vượt ngoài bản miễn phí này.

## 8. Đã có sẵn để qua kiểm duyệt cửa hàng
Xóa tài khoản trong app, chặn người dùng, báo cáo người dùng (lưu ở bảng `reports` của dữ liệu, bạn xem trong Atlas), chính sách quyền riêng tư, trang hướng dẫn xóa tài khoản.

## 9. Giới hạn đã biết của bản miễn phí
- Chỉ nhớ 1500 tin nhắn gần nhất trong bộ nhớ để hiển thị danh sách chat (lịch sử từng cuộc chat vẫn đọc từ Atlas). Ảnh nén dưới ~900 KB.
- Chưa mã hóa đầu cuối; chưa có gọi nhóm; chưa gửi file/voice; chưa có đăng nhập qua số điện thoại hay quên mật khẩu.
- App chỉ nhận cuộc gọi khi đang mở (thông báo đẩy chỉ áp dụng cho tin nhắn và cuộc gọi nhỡ).
- Đổi `SECRET` sẽ làm mọi người phải đăng nhập lại.
