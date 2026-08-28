import { afterEach, describe, expect, it, vi } from "vitest";
import { installMiniDom, descendants, findByText, MiniEvent } from "../support/mini-dom";

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mounted OfficersView interactions", () => {
  it("scrubs the mounted invitation URL and accepts with the captured credentials", async () => {
    const { document, replaceStateCalls } = installMiniDom("https://stuco.example/invite?organizationId=org-a&token=captured-secret");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true, membership: {
      id: "m-new", email: "new@school.edu", userId: "u-new", active: true,
      createdAt: "2026-08-27T00:00:00.000Z", updatedAt: null, deactivatedAt: null,
    } }));
    Object.assign(globalThis, { fetch: fetcher, IS_REACT_ACT_ENVIRONMENT: true });
    const [{ createRoot }, { act }, { OfficersView }] = await Promise.all([
      import("react-dom/client"), import("react"), import("../../app/components/OfficersView"),
    ]);
    const rootNode = document.createElement("div");
    document.body.appendChild(rootNode);
    const root = createRoot(rootNode as unknown as Element);

    await act(async () => { root.render(<OfficersView invitationMode />); await flush(); });
    expect(replaceStateCalls).toEqual([[null, "", "/invite"]]);
    const accept = findByText(rootNode, "button", "Accept invitation");
    await act(async () => { accept!.dispatchEvent(new MiniEvent("click")); await flush(); });

    expect(fetcher).toHaveBeenCalledWith("/api/officers/invitations/accept", expect.objectContaining({
      body: JSON.stringify({ organizationId: "org-a", token: "captured-secret" }),
    }));
    expect(rootNode.textContent).toContain("Access activated");
    await act(async () => root.unmount());
  });

  it("wires regeneration, copy recovery, conflict retry, and modal keyboard focus", async () => {
    const { document } = installMiniDom("https://stuco.example/");
    const snapshot = { memberships: [
      { id: "m-1", email: "one@school.edu", userId: "u-1", active: true, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: null, deactivatedAt: null },
      { id: "m-2", email: "two@school.edu", userId: "u-2", active: true, createdAt: "2026-08-02T00:00:00.000Z", updatedAt: null, deactivatedAt: null },
      { id: "m-3", email: "old@school.edu", userId: "u-3", active: false, createdAt: "2026-08-03T00:00:00.000Z", updatedAt: null, deactivatedAt: "2026-08-20T00:00:00.000Z" },
    ], invitations: [] };
    let deactivationAttempt = 0;
    let resolveRetry!: (response: Response) => void;
    const retryResponse = new Promise<Response>((resolve) => { resolveRetry = resolve; });
    const fetcher = vi.fn(async (url: string) => {
      if (url === "/api/officers") return Response.json({ ok: true, officers: snapshot });
      if (url === "/api/officers/invitations") return Response.json({ ok: true, invitation: { id: "i-1", email: "old@school.edu", status: "pending", expiresAt: "2026-09-03T00:00:00.000Z", createdAt: "2026-08-27T00:00:00.000Z", createdBy: "u-1" }, invitationUrl: "https://stuco.example/invite?token=private" }, { status: 201 });
      if (url.includes("/deactivate")) {
        deactivationAttempt += 1;
        if (deactivationAttempt === 1) return Response.json({ ok: false, issues: [{ message: "An organization must retain at least one active officer." }] }, { status: 409 });
        return retryResponse;
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    const writeText = vi.fn().mockRejectedValueOnce(new Error("denied")).mockResolvedValueOnce(undefined);
    Object.assign(globalThis, { fetch: fetcher, IS_REACT_ACT_ENVIRONMENT: true });
    Object.defineProperty(globalThis, "navigator", { configurable: true, writable: true, value: { userAgent: "mini-dom", clipboard: { writeText } } });
    const [{ createRoot }, { act }, { OfficersView }] = await Promise.all([
      import("react-dom/client"), import("react"), import("../../app/components/OfficersView"),
    ]);
    const rootNode = document.createElement("div"); document.body.appendChild(rootNode);
    const root = createRoot(rootNode as unknown as Element);
    await act(async () => { root.render(<OfficersView />); await flush(); });

    const regenerate = findByText(rootNode, "button", "Generate new link ↑")!;
    await act(async () => regenerate.dispatchEvent(new MiniEvent("click")));
    const emailInput = descendants(rootNode).find((element) => element.tagName === "INPUT" && element.getAttribute("aria-label") !== "Invitation link")!;
    expect(emailInput.value).toBe("old@school.edu");
    expect(document.activeElement).toBe(emailInput);
    expect(rootNode.textContent).toContain("Ready to generate a replacement link");

    const form = descendants(rootNode).find((element) => element.tagName === "FORM")!;
    await act(async () => { form.dispatchEvent(new MiniEvent("submit")); await flush(); });
    const copy = findByText(rootNode, "button", "Copy link")!;
    await act(async () => { copy.dispatchEvent(new MiniEvent("click")); await flush(); });
    expect(rootNode.textContent).toContain("Copy failed");
    await act(async () => { copy.dispatchEvent(new MiniEvent("click")); await flush(); });
    expect(rootNode.textContent).not.toContain("Copy failed");
    expect(rootNode.textContent).toContain("Copied");

    const deactivateTrigger = findByText(rootNode, "button", "Deactivate")!;
    await act(async () => deactivateTrigger.dispatchEvent(new MiniEvent("click")));
    expect(document.activeElement?.textContent).toBe("Cancel");
    const deactivate = findByText(rootNode, "button", "Deactivate officer")!;
    await act(async () => { deactivate.dispatchEvent(new MiniEvent("click")); await flush(); });
    expect(rootNode.textContent).toContain("An organization must retain at least one active officer.");
    const retry = findByText(rootNode, "button", "Retry deactivation")!;
    await act(async () => { retry.dispatchEvent(new MiniEvent("click")); await flush(); });
    const dialog = descendants(rootNode).find((element) => element.getAttribute("role") === "dialog")!;
    await act(async () => dialog.dispatchEvent(new MiniEvent("keydown", { key: "Escape" })));
    expect(descendants(rootNode).some((element) => element.getAttribute("role") === "dialog")).toBe(true);
    resolveRetry(Response.json({ ok: true }));
    await act(async () => { await flush(); });
    expect(descendants(rootNode).some((element) => element.getAttribute("role") === "dialog")).toBe(false);
    expect(document.activeElement).toBe(deactivateTrigger);
    await act(async () => root.unmount());
  });
});
