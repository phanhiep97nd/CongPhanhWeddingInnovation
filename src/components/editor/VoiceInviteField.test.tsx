import { afterEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import VoiceInviteField from "./VoiceInviteField";
import GuestVoice from "../invitation/GuestVoice";

vi.mock("../../lib/images", () => ({ uploadAudio: vi.fn(async (file: File) => `https://res.cloudinary.com/demo/video/upload/${file.name}`) }));
afterEach(() => { vi.unstubAllGlobals(); });

function Field({ locked = false }: { locked?: boolean }) {
  const [value, setValue] = useState("");
  return <><VoiceInviteField value={value} onChange={setValue} locked={locked} onUpgrade={vi.fn()} /><output>{value}</output></>;
}

it("disables recording and uploads on accounts without Premium", () => {
  render(<Field locked />);
  expect(screen.getByRole("note")).toHaveTextContent("Lời mời ghi âm cho từng khách cần gói Cao cấp.");
  expect(screen.getByRole("button", { name: /Ghi âm trực tiếp/ })).toBeDisabled();
  expect(document.querySelector<HTMLInputElement>('input[type="file"]')).toBeDisabled();
});

it("uploads an audio file, plays it back and can remove it", async () => {
  render(<Field />);
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(["x"], "loi-moi.mp3", { type: "audio/mpeg" })] } });
  await waitFor(() => expect(document.querySelector("output")).toHaveTextContent("https://res.cloudinary.com/demo/video/upload/loi-moi.mp3"));
  expect(screen.getByLabelText("Nghe lại lời mời ghi âm")).toHaveAttribute("src", "https://res.cloudinary.com/demo/video/upload/loi-moi.mp3");
  fireEvent.click(screen.getByRole("button", { name: /Xóa ghi âm/ }));
  expect(document.querySelector("output")).toBeEmptyDOMElement();
});

it("records from the microphone and uploads the recording when stopped", async () => {
  const stopTrack = vi.fn();
  class FakeRecorder {
    static isTypeSupported = (type: string) => type === "audio/webm";
    mimeType = "audio/webm"; state = "inactive";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["voice"], { type: "audio/webm" }) }); this.onstop?.(); }
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) } });
  render(<Field />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Ghi âm trực tiếp/ })); });
  fireEvent.click(await screen.findByRole("button", { name: /Dừng ghi/ }));
  await waitFor(() => expect(document.querySelector("output")).toHaveTextContent("https://res.cloudinary.com/demo/video/upload/loi-moi.webm"));
  expect(stopTrack).toHaveBeenCalled();
});

it("lets the guest play the couple's recording, pausing other music first", async () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(async () => {});
  const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  render(<><audio data-testid="music" /><GuestVoice src="https://res.cloudinary.com/demo/video/upload/v.webm" couple="Minh & Hoa" /></>);
  fireEvent.click(screen.getByRole("button", { name: "Nghe lời mời từ Minh & Hoa" }));
  expect(pause).toHaveBeenCalled();
  expect(play).toHaveBeenCalled();
});
