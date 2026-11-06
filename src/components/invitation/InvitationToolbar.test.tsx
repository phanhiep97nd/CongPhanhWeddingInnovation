import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import InvitationToolbar from "./InvitationToolbar";
import { wedding } from "../../test/plan-fixtures";

function sent(blessings?: boolean) {
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const post = vi.spyOn(iframe.contentWindow!, "postMessage");
  render(<InvitationToolbar frame={{ current: iframe }} wedding={{ ...wedding, theme: { ...wedding.theme, blessings } }} />);
  const message = post.mock.calls.map(call => call[0] as { type: string; wishes: unknown[] }).find(data => data.type === "ht:blessings");
  iframe.remove();
  return message?.wishes;
}

it("lets owners stop wishes from scrolling over the card while keeping the default on", () => {
  expect(sent(undefined)?.length).toBeGreaterThan(0);
  expect(sent(false)).toEqual([]);
});
