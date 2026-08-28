import { describe, expect, it, vi } from "vitest";
import {
  consumeInvitationLocation,
  containDialogKeyboard,
  copyInvitationLink,
  createInvitationRequest,
  acceptInvitationRequest,
  deactivateMembershipRequest,
  focusInvitationForm,
  focusDialogInitially,
  restoreDialogTrigger,
} from "../../app/components/OfficersView";

describe("OfficersView behavior", () => {
  it("creates an invitation with the entered email and preserves the one-time link response", async () => {
    const invitation = { id: "i-1", email: "new@school.edu", status: "pending" as const, expiresAt: "2026-09-03T00:00:00.000Z", createdAt: "2026-08-27T00:00:00.000Z", createdBy: "u-1" };
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true, invitation, invitationUrl: "https://stuco.example/invite?token=secret" }, { status: 201 }));

    const result = await createInvitationRequest(fetcher, "new@school.edu");

    expect(result).toEqual({ invitation, invitationUrl: "https://stuco.example/invite?token=secret" });
    expect(fetcher).toHaveBeenCalledWith("/api/officers/invitations", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "new@school.edu" }),
    }));
  });

  it("captures invitation credentials and removes them from address-bar history immediately", () => {
    const replaceState = vi.fn();
    const invitation = consumeInvitationLocation(
      { href: "https://stuco.example/invite?organizationId=org-a&token=secret-token" },
      { replaceState },
    );

    expect(invitation).toEqual({ organizationId: "org-a", token: "secret-token" });
    expect(replaceState).toHaveBeenCalledWith(null, "", "/invite");
  });

  it("returns the server's actionable conflict instead of hiding it behind a generic failure", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({
      ok: false,
      issues: [{ code: "LAST_ACTIVE_OFFICER", message: "An organization must retain at least one active officer." }],
    }, { status: 409 }));

    await expect(deactivateMembershipRequest(fetcher, "member-last"))
      .rejects.toThrow("An organization must retain at least one active officer.");
  });

  it("accepts only the captured invitation credentials after the URL has been scrubbed", async () => {
    const membership = { id: "m-1", email: "new@school.edu", userId: "u-1", active: true, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: null, deactivatedAt: null };
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true, membership }));

    await expect(acceptInvitationRequest(fetcher, { organizationId: "org-a", token: "captured-secret" })).resolves.toEqual(membership);
    expect(fetcher).toHaveBeenCalledWith("/api/officers/invitations/accept", expect.objectContaining({
      body: JSON.stringify({ organizationId: "org-a", token: "captured-secret" }),
    }));
  });

  it("clears a stale clipboard error after the invitation link copies successfully", async () => {
    const setError = vi.fn();
    const copied = await copyInvitationLink("https://stuco.example/invite?token=secret", {
      writeText: vi.fn().mockResolvedValue(undefined),
    }, setError);

    expect(copied).toBe(true);
    expect(setError).toHaveBeenLastCalledWith(null);
  });

  it("keeps a useful error when clipboard access fails", async () => {
    const setError = vi.fn();
    const copied = await copyInvitationLink("https://stuco.example/invite?token=secret", {
      writeText: vi.fn().mockRejectedValue(new Error("denied")),
    }, setError);

    expect(copied).toBe(false);
    expect(setError).toHaveBeenLastCalledWith("Copy failed. Select the invitation link and copy it manually.");
  });

  it("moves regeneration back to the visibly actionable invite form", () => {
    const setEmail = vi.fn();
    const focus = vi.fn();
    const scrollIntoView = vi.fn();
    focusInvitationForm("INACTIVE@SCHOOL.EDU", setEmail, { focus }, { scrollIntoView });

    expect(setEmail).toHaveBeenCalledWith("inactive@school.edu");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(focus).toHaveBeenCalled();
  });

  it("closes a confirmation dialog on Escape", () => {
    const close = vi.fn();
    const event = { key: "Escape", shiftKey: false, preventDefault: vi.fn() };
    containDialogKeyboard(event, [], -1, close);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it("ignores Escape while deactivation is in flight", () => {
    const close = vi.fn();
    const event = { key: "Escape", shiftKey: false, preventDefault: vi.fn() };
    containDialogKeyboard(event, [], -1, close, true);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it("moves initial modal focus to Cancel and restores the invoking control on close", () => {
    const cancelFocus = vi.fn(), triggerFocus = vi.fn();
    focusDialogInitially({ focus: cancelFocus });
    restoreDialogTrigger({ focus: triggerFocus }, (callback) => callback());

    expect(cancelFocus).toHaveBeenCalledOnce();
    expect(triggerFocus).toHaveBeenCalledOnce();
  });

  it("wraps Tab focus inside the confirmation dialog", () => {
    const first = { focus: vi.fn() }, last = { focus: vi.fn() };
    const event = { key: "Tab", shiftKey: false, preventDefault: vi.fn() };
    containDialogKeyboard(event, [first, last], 1, vi.fn());

    expect(event.preventDefault).toHaveBeenCalled();
    expect(first.focus).toHaveBeenCalled();
    expect(last.focus).not.toHaveBeenCalled();
  });

  it("wraps Shift+Tab from the first control to the last control", () => {
    const first = { focus: vi.fn() }, last = { focus: vi.fn() };
    const event = { key: "Tab", shiftKey: true, preventDefault: vi.fn() };
    containDialogKeyboard(event, [first, last], 0, vi.fn());

    expect(event.preventDefault).toHaveBeenCalled();
    expect(last.focus).toHaveBeenCalled();
  });
});
