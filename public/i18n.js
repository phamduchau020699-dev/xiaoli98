// Đa ngôn ngữ: vi / en / zh. Thêm ngôn ngữ mới bằng cách thêm 1 khối vào L.
const L={
vi:{name:'Tiếng Việt',delAcc:'Xóa tài khoản',delConfirm:'Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu? Không thể khôi phục.',delPwd:'Nhập mật khẩu để xác nhận:',privacy:'Chính sách quyền riêng tư',pushOk:'Đã bật thông báo',pushNo:'Thiết bị/trình duyệt không hỗ trợ hoặc bạn chưa cấp quyền thông báo',report:'Báo cáo',reportWhy:'Lý do báo cáo:',reported:'Đã gửi báo cáo',chats:'Tin nhắn',contacts:'Danh bạ',moments:'Khoảnh khắc',me:'Tôi',send:'Gửi',typeMsg:'Nhập tin nhắn...',login:'Đăng nhập',register:'Đăng ký',createAcc:'Tạo tài khoản',
 noAcc:'Chưa có tài khoản? Đăng ký',haveAcc:'Đã có tài khoản? Đăng nhập',username:'Tên đăng nhập',password:'Mật khẩu (≥6 ký tự)',displayName:'Tên hiển thị',
 searchPh:'Tìm bạn theo tên hoặc ID',search:'Tìm',addFriend:'Kết bạn',sent:'Đã gửi',isFriend:'Bạn bè',received:'Đã gửi lời mời cho bạn',blockedTag:'Đã chặn',noResult:'Không tìm thấy',
 requests:'Lời mời kết bạn',accept:'Đồng ý',decline:'Từ chối',block:'Chặn',unblock:'Bỏ chặn',blockedList:'Danh sách chặn',confirmBlock:'Chặn người này? Hai bên sẽ không còn là bạn bè.',
 language:'Ngôn ngữ',notif:'Bật thông báo',logout:'Đăng xuất',voice:'Thoại',video:'Video',calling:'Đang gọi...',incomingVoice:'gọi thoại cho bạn',incomingVideo:'gọi video cho bạn',
 mute:'Tắt mic',cam:'Tắt cam',flip:'Đổi cam',end:'Kết thúc',mediaErr:'Không truy cập được micro/camera. Hãy cấp quyền cho ứng dụng.',
 f_busy:'Máy bận',f_offline:'Người này đang ngoại tuyến',f_not_friend:'Chỉ gọi được cho bạn bè',f_blocked:'Không thể gọi',f_no_answer:'Không có người nghe máy',rejected:'Đã bị từ chối',ended:'Cuộc gọi kết thúc',
 newGroup:'+Nhóm',groupName:'Tên nhóm:',groupMembers:'Nhập ID thành viên, cách nhau dấu phẩy. Bạn bè: ',noChats:'Chưa có cuộc trò chuyện. Vào Danh bạ để kết bạn.',post:'Đăng',thinking:'Bạn đang nghĩ gì?',reqSent:'Đã gửi lời mời kết bạn',nowFriends:'Hai bạn đã là bạn bè'},
en:{name:'English',delAcc:'Delete account',delConfirm:'Permanently delete your account and all data? This cannot be undone.',delPwd:'Enter your password to confirm:',privacy:'Privacy policy',pushOk:'Notifications enabled',pushNo:'Not supported on this device/browser or permission denied',report:'Report',reportWhy:'Reason for report:',reported:'Report sent',chats:'Chats',contacts:'Contacts',moments:'Moments',me:'Me',send:'Send',typeMsg:'Type a message...',login:'Log in',register:'Sign up',createAcc:'Create account',
 noAcc:'No account? Sign up',haveAcc:'Have an account? Log in',username:'Username',password:'Password (6+ chars)',displayName:'Display name',
 searchPh:'Search by name or ID',search:'Search',addFriend:'Add friend',sent:'Sent',isFriend:'Friend',received:'Sent you a request',blockedTag:'Blocked',noResult:'No results',
 requests:'Friend requests',accept:'Accept',decline:'Decline',block:'Block',unblock:'Unblock',blockedList:'Blocked list',confirmBlock:'Block this user? You will no longer be friends.',
 language:'Language',notif:'Enable notifications',logout:'Log out',voice:'Voice',video:'Video',calling:'Calling...',incomingVoice:'is calling you',incomingVideo:'is video calling you',
 mute:'Mute',cam:'Camera',flip:'Flip',end:'End',mediaErr:'Cannot access microphone/camera. Please grant permission.',
 f_busy:'Line busy',f_offline:'User is offline',f_not_friend:'You can only call friends',f_blocked:'Cannot call',f_no_answer:'No answer',rejected:'Call declined',ended:'Call ended',
 newGroup:'+Group',groupName:'Group name:',groupMembers:'Enter member IDs separated by commas. Friends: ',noChats:'No chats yet. Go to Contacts to add friends.',post:'Post',thinking:"What's on your mind?",reqSent:'Friend request sent',nowFriends:'You are now friends'},
zh:{name:'中文',delAcc:'注销账号',delConfirm:'永久删除账号和所有数据？此操作无法恢复。',delPwd:'输入密码确认：',privacy:'隐私政策',pushOk:'已开启通知',pushNo:'设备/浏览器不支持或未授予通知权限',report:'举报',reportWhy:'举报原因：',reported:'举报已提交',chats:'消息',contacts:'通讯录',moments:'朋友圈',me:'我',send:'发送',typeMsg:'输入消息...',login:'登录',register:'注册',createAcc:'创建账号',
 noAcc:'没有账号？注册',haveAcc:'已有账号？登录',username:'用户名',password:'密码（至少6位）',displayName:'昵称',
 searchPh:'按昵称或ID搜索',search:'搜索',addFriend:'加好友',sent:'已发送',isFriend:'好友',received:'向你发来申请',blockedTag:'已拉黑',noResult:'未找到',
 requests:'好友申请',accept:'同意',decline:'拒绝',block:'拉黑',unblock:'取消拉黑',blockedList:'黑名单',confirmBlock:'确定拉黑此人？你们将不再是好友。',
 language:'语言',notif:'开启通知',logout:'退出登录',voice:'语音',video:'视频',calling:'呼叫中...',incomingVoice:'邀请你语音通话',incomingVideo:'邀请你视频通话',
 mute:'静音',cam:'摄像头',flip:'翻转',end:'挂断',mediaErr:'无法访问麦克风/摄像头，请授予权限。',
 f_busy:'对方忙线',f_offline:'对方不在线',f_not_friend:'只能呼叫好友',f_blocked:'无法呼叫',f_no_answer:'无人接听',rejected:'对方已拒绝',ended:'通话结束',
 newGroup:'+群聊',groupName:'群名称：',groupMembers:'输入成员ID，用逗号分隔。好友：',noChats:'暂无会话，请到通讯录添加好友。',post:'发布',thinking:'此刻的想法...',reqSent:'好友申请已发送',nowFriends:'你们已成为好友'}};
let lang=localStorage.lang||(/^zh/.test(navigator.language)?'zh':/^vi/.test(navigator.language)?'vi':'en');
if(!L[lang])lang='vi';
const t=k=>L[lang][k]??L.vi[k]??k;
