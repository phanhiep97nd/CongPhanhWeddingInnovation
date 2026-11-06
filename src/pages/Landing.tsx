import { BRAND_NAME, BRAND_TAGLINE } from "../lib/brand";
import BrandLogo from "../components/BrandLogo";
import LandingDesignGallery from "../components/LandingDesignGallery";
import { Link } from "react-router-dom";
import { CalendarDays, CircleCheck, Heart, Images, Mic, Sparkles } from "lucide-react";

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
          <p>Chọn một trong hơn 280 mẫu thiệp, chạm thẳng vào thiệp để sửa. Tên hai bạn, ngày cưới, lịch, ngày âm lịch và đồng hồ đếm ngược tự điền theo thông tin của bạn. Mỗi khách mở thiệp thấy tên mình trên phong thư, nghe lời mời bằng chính giọng hai bạn và xác nhận tham dự ngay trên thiệp.
          </p>
          <div className="actions">
            <Link className="button" to="/register">Tạo thiệp miễn phí
            </Link>
            <a className="text-button" href="#bo-suu-tap">Khám phá bộ sưu tập ↗</a>
          </div>
          <ul className="hero-details" aria-label="Điểm nổi bật">
            <li>✦ Hơn 280 mẫu thiệp</li>
            <li>♡ Tên từng khách trên phong thư</li>
            <li>♪ Lời mời bằng giọng nói</li>
            <li>◷ Ngày, lịch âm, đếm ngược tự điền</li>
            <li>✓ Xác nhận tham dự trên thiệp</li>
          </ul>
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
      <section className="landing-highlights" aria-labelledby="diem-noi-bat">
        <div className="landing-highlights-head">
          <p className="landing-eyebrow">Vì sao chọn {BRAND_NAME}</p>
          <h2 id="diem-noi-bat">Chuẩn bị nhẹ nhàng, đón ngày vui trọn vẹn</h2>
        </div>
        <div className="landing-highlights-grid">
          <article><span aria-hidden="true"><Sparkles size={19} /></span><h3>Chạm vào thiệp để sửa</h3><p>Hơn 280 mẫu thiệp cưới, sinh nhật, tân gia. Bấm vào chữ hay ảnh ngay trên thiệp, ô sửa mở ra bên cạnh, cả trên điện thoại.</p></article>
          <article><span aria-hidden="true"><CalendarDays size={19} /></span><h3>Thông tin tự điền</h3><p>Nhập tên và ngày cưới một lần: tên viết tắt, lịch tháng cưới, thứ, ngày âm lịch và đồng hồ đếm ngược trên thiệp tự cập nhật.</p></article>
          <article><span aria-hidden="true"><Heart size={19} /></span><h3>Lời mời gửi tận tên</h3><p>Mỗi khách có một đường dẫn riêng. Tên họ hiện trên phong thư mở thiệp và trên ảnh xem trước khi gửi qua Zalo, Messenger.</p></article>
          <article><span aria-hidden="true"><Mic size={19} /></span><h3>Lời mời bằng giọng nói</h3><p>Ghi âm trực tiếp hoặc tải lên một lời mời riêng cho từng khách; khách bấm nghe ngay khi mở thiệp.</p></article>
          <article><span aria-hidden="true"><Images size={19} /></span><h3>Album trong một lần tải</h3><p>Chọn nhiều ảnh cùng lúc, thiệp tự xếp ảnh vào các khung của mẫu. Thêm hộp mừng cưới với mã QR ngân hàng hoặc ví điện tử.</p></article>
          <article><span aria-hidden="true"><CircleCheck size={19} /></span><h3>Biết ai sẽ đến</h3><p>Khách xác nhận tham dự và gửi lời chúc trên thiệp. Danh sách, số người và mã QR từng khách nằm gọn trong tài khoản của bạn.</p></article>
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
      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-brand">
            <Link className="brand" to="/" aria-label={BRAND_NAME}><BrandLogo /></Link>
            <p>{BRAND_TAGLINE}. Một nơi nhỏ cho những ngày thật đáng nhớ.</p>
          </div>
          <nav aria-label="Sản phẩm">
            <h2>Sản phẩm</h2>
            <a href="#bo-suu-tap">Kho mẫu thiệp</a>
            <a href="#cach-tao">Cách tạo thiệp</a>
            <a href="#cau-hoi">Câu hỏi thường gặp</a>
          </nav>
          <nav aria-label="Tài khoản">
            <h2>Tài khoản</h2>
            <Link to="/register">Tạo thiệp miễn phí</Link>
            <Link to="/login">Đăng nhập</Link>
          </nav>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} {BRAND_NAME} · hythiep.net</span>
          <span>Thiết kế &amp; phát triển bởi <strong>Hiepphan</strong></span>
        </div>
      </footer>
    </main>
  );
}
