import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DateInput from "./DateInput";

it("shows and takes dates as dd/mm/yyyy while keeping ISO values", () => {
  const change = vi.fn();
  const { rerender } = render(<DateInput aria-label="Ngày cưới" value="2026-12-15" onChange={change} />);
  const input = screen.getByLabelText("Ngày cưới");
  expect(input).toHaveValue("15/12/2026");
  fireEvent.change(input, { target: { value: "1402" } });
  expect(input).toHaveValue("14/02");
  expect(change).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "14022027" } });
  expect(change).toHaveBeenLastCalledWith("2027-02-14");
  rerender(<DateInput aria-label="Ngày cưới" value="2027-02-14" onChange={change} />);
  fireEvent.change(input, { target: { value: "31/02/2027" } });
  expect(screen.getByRole("alert")).toHaveTextContent("Ngày không hợp lệ");
  expect(change).toHaveBeenCalledTimes(1);
  fireEvent.change(input, { target: { value: "" } });
  expect(change).toHaveBeenLastCalledWith(null);
});
