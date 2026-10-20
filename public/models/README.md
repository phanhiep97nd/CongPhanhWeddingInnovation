# Nhân vật Hỷ 3D

Đặt hai file `bride.glb` và `groom.glb` vào thư mục này. Không cần sửa code.
Scene vẽ chibi ngay, kiểm tra hai URL bằng HEAD, rồi thay cả cặp khi tải xong.
Thiếu file, tải lỗi hoặc GLB không hợp lệ thì giữ chibi. Không có animation vẫn hiện model.

## Tạo hình bằng Tripo3D hoặc Meshy

1. Chọn image-to-3D từ ảnh cô dâu/chú rể hoặc text-to-3D. Tạo từng người riêng,
   toàn thân, đứng thẳng, nhìn theo trục +Z, tư thế T-pose/A-pose, hai bàn tay tách khỏi thân.
   Không tạo đế, sàn, cảnh nền hoặc gộp hai người trong một mesh.
2. Xuất GLB có texture PBR. Giảm polygon trước khi rig; nên giữ mỗi người khoảng
   8–12 nghìn tam giác, tối đa 2–3 material, texture 1024 px. Mục tiêu dưới 2,5 MB/file.
3. Runtime tự đặt chân ở y = 0, đưa chiều cao cô dâu về 1,6 m, chú rể về 1,7 m
   và điều chỉnh khoảng cách camera. Hướng mặt và chất lượng rig vẫn cần kiểm tra trong Blender.

## Rig và animation trong Mixamo

1. Import FBX/GLB từ dịch vụ tạo hình vào Blender. Nếu đầu vào là GLB, xuất FBX để
   upload vào Mixamo (không dựa vào việc Mixamo hỗ trợ upload GLB trực tiếp).
2. Chạy auto-rig, kiểm tra cổ tay và bàn chân. Tải các chuyển động
   **Idle**, **Walking**, **Waving**, **Pointing**, **Hug**, **Holding Idle** hoặc clip tương đương.
   Chọn **In Place** cho Walking để vị trí vẫn do đường đi của thiệp điều khiển.
3. Chọn **FBX Binary, With Skin** khi tải. Trong Blender, import các FBX, giữ một
   armature và một bộ mesh, chuyển các action sang cùng armature nếu cần.
   Xóa những mesh/armature trùng, kiểm tra từng action dùng đúng tên bone.
4. Đổi tên action thành `idle`, `walk`, `wave`, `point`, `hug`, `hold`.
   Xuất **glTF Binary (.glb)** với skin và tất cả action/animation được bật.
   Không gộp toàn bộ action thành một clip. Giữ bone tay phải tên `RightHand`,
   `mixamorig:RightHand` hoặc `hand_r` để gắn phong bao.
5. Dùng Meshopt nếu công cụ export hỗ trợ; có thể nén sau bằng gltfpack bên ngoài repo.
   Runtime đã cấu hình MeshoptDecoder đi kèm three.js, không tải decoder từ CDN.
   GLB không nén cũng hoạt động. Blender có tùy chọn Draco, nhưng bản runtime này
   chưa có decoder Draco: hãy xuất lại không Draco hoặc chuyển sang Meshopt trước khi dùng.

Runtime tìm tên clip bằng phép chứa chuỗi không phân biệt hoa/thường. Trọng số lớn
nhất quyết định clip, hòa điểm ưu tiên walk → hold → hug → point → wave → idle.
Clip thiếu dùng idle; nếu không có idle thì dùng clip đầu tiên. Crossfade 0,25 giây;
tốc độ walk theo trọng số đi bộ. Với model không có clip nào, giữ nguyên tư thế gốc.

## Kiểm tra trên điện thoại

Mở `/__hy3d?intro=0&p=0.43&stats=1` trong môi trường dev; thêm `&lowPower=1` để
kiểm tra cấu hình nhẹ. Thử cả intro, đầu/cuối đường và các trạm, trong Zalo/Messenger.
Ngân sách gồm cả shadow pass: normal ≤ 220.000 tam giác / 80 draw call,
lowPower ≤ 110.000 / 60. Model AI có thể vượt ngân sách dù file nhỏ: kiểm tra
polygon, material, transparency và draw call sau khi thay model thật.
