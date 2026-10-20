import { BRAND_NAME } from "../lib/brand";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <main className="landing">
      <nav className="topbar" aria-label="Điều hướng chính">
        <Link className="brand" to="/">{BRAND_NAME}
        </Link>
        <div>
          <Link to="/login" aria-label="Đăng nhập tài khoản">Đăng nhập
          </Link>
          <Link className="button" to="/register"><span className="desktop-label">Tạo thiệp miễn phí</span><span className="mobile-label">Tạo thiệp</span>
          </Link>
        </div>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <h1>Một lời mời dành riêng cho từng người thương
          </h1>
          <p>Kể câu chuyện của hai bạn bằng ảnh và lời riêng. Gửi đường dẫn có tên từng khách, nhận xác nhận tham dự và cùng lưu ảnh sau ngày vui.
          </p>
          <div className="actions">
            <Link className="button" to="/register">Tạo thiệp miễn phí
            </Link>
            <Link className="text-button" to="/login">Đăng nhập
            </Link>
          </div>
        </div>
        <div className="landing-preview" aria-label="Bản xem trước thiệp cưới">
          <img src="/images/DSCF7944.jpg" alt="Ảnh cưới trong bản xem trước thiệp" />
          <div className="landing-preview-copy">
            <p>Trân trọng kính mời chị Thu Hà
            </p>
            <h2>Phương Anh <span>&amp;</span> Minh Công
            </h2>
            <p>03 · 04 · 2026
            </p>
          </div>
        </div>
      </section>
      <section className="landing-story">
        <h2>Thiệp đi cùng ngày cưới
        </h2>
        <div>
          <p>
            <strong>Mời đúng người.
            </strong> Mỗi khách có một liên kết riêng và nhìn thấy tên mình ngay khi mở thiệp.
          </p>
          <p>
            <strong>Biết ai sẽ đến.
            </strong> Khách xác nhận tham dự trên thiệp; danh sách được cập nhật cho hai bạn.
          </p>
          <p>
            <strong>Giữ trọn khoảnh khắc.
            </strong> Bật hoặc ẩn từng phần của thiệp, rồi đón ảnh khách gửi vào cùng một nơi.
          </p>
        </div>
      </section>
      <section className="landing-link-preview">
        <div>
          <h2>Một đường dẫn, một lời mời có tên người nhận</h2>
          <p>Khi gửi qua Zalo hoặc Messenger, mỗi khách nhận một liên kết riêng. Tên của họ hiện ngay trên thiệp để lời mời gần gũi như cách hai bạn gọi nhau ngoài đời.</p>
        </div>
        <div className="chat-preview" aria-label="Ví dụ lời mời gửi cho khách">
          <p className="chat-sender">Tin nhắn từ hai bạn</p>
          <div className="chat-bubble">Thu Hà ơi, mời chị đến chung vui trong ngày cưới của chúng em nhé.</div>
          <div className="link-preview-card">
            <img src="/images/DSCF7944.jpg" alt="Ảnh cưới trên bản xem trước liên kết" />
            <div>
              <strong>Thiệp mời dành cho chị Thu Hà</strong>
              <span>Phương Anh &amp; Minh Công · 03.04.2026</span>
            </div>
          </div>
        </div>
      </section>
      <section className="landing-steps">
        <h2>Từ tấm thiệp đến ngày gặp nhau</h2>
        <div>
          <p><strong>Viết lời mời.</strong> Thêm ảnh, câu chuyện, lịch trình và những điều khách cần biết.</p>
          <p><strong>Gửi đến từng người.</strong> Tạo liên kết có tên khách rồi gửi trong cuộc trò chuyện quen thuộc.</p>
          <p><strong>Đón lời hồi đáp.</strong> Theo dõi xác nhận tham dự và giữ ảnh mọi người chia sẻ sau buổi lễ.</p>
        </div>
      </section>
      <section className="landing-close">
        <h2>Ngày vui bắt đầu từ một lời mời thật riêng.</h2>
        <Link className="button" to="/register">Tạo thiệp miễn phí</Link>
      </section>
      <footer className="landing-footer"><span>{BRAND_NAME}</span><span>Một nơi nhỏ cho ngày trọng đại của hai bạn.</span></footer>
    </main>
  );
}
