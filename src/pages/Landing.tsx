import { BRAND_NAME } from "../lib/brand";
import BrandLogo from "../components/BrandLogo";
import LandingDesignGallery from "../components/LandingDesignGallery";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <main className="landing">
      <nav className="topbar" aria-label="Điều hướng chính">
        <Link className="brand" to="/" aria-label={BRAND_NAME}><BrandLogo />
        </Link>
        <div>
          <a className="landing-nav-link" href="#bo-suu-tap">Kho mẫu</a>
          <a className="landing-nav-link" href="#cach-tao">Cách tạo thiệp</a>
          <Link to="/login" aria-label="Đăng nhập tài khoản">Đăng nhập
          </Link>
          <Link className="button" to="/register"><span className="desktop-label">Tạo thiệp miễn phí</span><span className="mobile-label">Tạo thiệp</span>
          </Link>
        </div>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">Hỷ Thiệp · Gửi niềm vui, giữ kỷ niệm</p>
          <h1>Một lời mời dành riêng cho từng người thương
          </h1>
          <p>Ngày cưới, sinh nhật hay buổi tân gia đầu tiên — kể câu chuyện của bạn bằng ảnh và lời riêng. Gửi lời mời có tên từng khách và nhận xác nhận tham dự ngay trên thiệp.
          </p>
          <div className="actions">
            <Link className="button" to="/register">Tạo thiệp miễn phí
            </Link>
            <a className="text-button" href="#bo-suu-tap">Khám phá bộ sưu tập ↗</a>
          </div>
          <div className="hero-details"><span>✦ Sửa ngay trên điện thoại</span><span>♡ Lời mời có tên riêng</span><span>✓ Theo dõi người tham dự</span></div>
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
      <div className="occasion-ribbon" aria-label="Thiệp cho mọi dịp">Ngày chung đôi <span>✦</span> Thêm tuổi mới <span>✦</span> Về nhà mới <span>✦</span> Gặp gỡ & sẻ chia</div>
      <section className="landing-story">
        <h2>Chuẩn bị nhẹ nhàng, đón ngày vui trọn vẹn
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
      <LandingDesignGallery />
      <section className="landing-steps" id="cach-tao">
        <h2>Từ tấm thiệp đến ngày gặp nhau</h2>
        <div>
          <p><span className="step-number">01</span><strong>Chọn mẫu, viết lời mời.</strong> Lọc theo dịp vui, thay ảnh và chạm vào chữ để sửa nội dung.</p>
          <p><span className="step-number">02</span><strong>Xem thử trước khi gửi.</strong> Kiểm tra thiệp trên điện thoại, chọn chuyển động và hiệu ứng mở thiệp.</p>
          <p><span className="step-number">03</span><strong>Gửi đi và đón lời hồi đáp.</strong> Mời từng người bằng liên kết riêng, theo dõi xác nhận ngay trong tài khoản.</p>
        </div>
      </section>
      <section className="landing-faq" id="cau-hoi"><div><p className="landing-eyebrow">Những điều bạn muốn biết</p><h2>Bắt đầu thật dễ dàng.</h2><p>Bạn không cần biết thiết kế để có một lời mời mang dấu ấn riêng.</p></div><div>
        <details><summary>Tôi có thể sửa thiệp bằng điện thoại không?</summary><p>Có. Chọn phần chữ hoặc ảnh trong khung xem trước để thay nội dung, rồi lưu thay đổi trước khi gửi.</p></details>
        <details><summary>Có những loại thiệp nào?</summary><p>Bộ sưu tập gồm thiệp cưới, sinh nhật, tân gia và sự kiện. Bạn có thể tìm mẫu theo tên hoặc lọc theo danh mục.</p></details>
        <details><summary>Sửa thiệp sau khi gửi có đổi đường dẫn không?</summary><p>Không. Khi bạn lưu nội dung mới, khách mở lại đường dẫn cũ sẽ thấy bản cập nhật.</p></details>
        <details><summary>Làm sao biết khách có tham dự?</summary><p>Khách xác nhận ngay trên thiệp. Bạn xem danh sách và số người tham dự trong mục Khách mời.</p></details>
      </div></section>
      <section className="landing-close">
        <h2>Ngày vui bắt đầu từ một lời mời thật riêng.</h2>
        <Link className="button" to="/register">Tạo thiệp miễn phí</Link>
      </section>
      <footer className="landing-footer"><span>{BRAND_NAME}</span><span>Một nơi nhỏ cho những ngày thật đáng nhớ.</span><a href="#cau-hoi">Câu hỏi thường gặp</a></footer>
    </main>
  );
}
