import { describe, expect, it } from "vitest";
import { cldUrl, resizeImageFile } from "./images";
describe("image helpers", () => {
  it("adds width and automatic format to Cloudinary images", () => {
    expect(cldUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg", 420)).toContain("/f_auto,q_auto,w_420/");
  });
  it("rounds Cloudinary widths", () => {
    expect(cldUrl("https://res.cloudinary.com/demo/image/upload/a.jpg", 420.8)).toContain("w_421");
  });
  it("leaves other hosts unchanged", () => {
    expect(cldUrl("https://example.test/a.jpg", 420)).toBe("https://example.test/a.jpg");
  });
  it("leaves other Cloudinary resource types unchanged", () => {
    expect(cldUrl("https://res.cloudinary.com/demo/video/upload/a.mp4", 420)).toBe("https://res.cloudinary.com/demo/video/upload/a.mp4");
  });
  it("rejects a non-image before attempting resize", async () => {
    await expect(resizeImageFile(new File(["x"], "x.txt", { type: "text/plain" }))).rejects.toThrow("Vui lòng chọn tệp ảnh.");
  });
});
