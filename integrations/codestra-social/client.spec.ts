import {
  CodestraSocialRuntimeClient,
  IdempotencyConflictError,
  RuntimeRequestError,
} from "./client";

const publication = {
  clientReference: "cmd-1",
  socialAccountId: "account-1",
  provider: "sandbox",
  codestraPostId: "post-1",
  runtimePostId: "runtime-1",
  contentFingerprint: "sha256:content",
  state: "ACCEPTED" as const,
  createdAt: "2026-09-13T00:00:00.000Z",
  updatedAt: "2026-09-13T00:00:00.000Z",
};

describe("CodestraSocialRuntimeClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("keeps publishing fail-closed without both gates", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const client = new CodestraSocialRuntimeClient("https://social.test", "token", true, false);
    await expect(
      client.publish(
        {
          clientReference: "cmd-1",
          socialAccountId: "account-1",
          codestraPostId: "post-1",
          contentFingerprint: "sha256:content",
        },
        "correlation-1",
        "cmd-1",
      ),
    ).rejects.toThrow("social_publishing_disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("publishes with stable identity headers and normalized URL", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(publication), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );
    global.fetch = fetchMock;

    const client = new CodestraSocialRuntimeClient("https://social.test/", "token", true, true);
    await expect(
      client.publish(
        {
          clientReference: "cmd-1",
          socialAccountId: "account-1",
          codestraPostId: "post-1",
          contentFingerprint: "sha256:content",
        },
        "correlation-1",
        "cmd-1",
      ),
    ).resolves.toEqual(publication);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://social.test/v2/social/publications",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "X-Correlation-ID": "correlation-1",
          "Idempotency-Key": "cmd-1",
        }),
      }),
    );
  });

  it("maps conflicting replays to a typed error", async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 409 }));
    const client = new CodestraSocialRuntimeClient("https://social.test", "token", true, true);

    await expect(
      client.publish(
        {
          clientReference: "cmd-1",
          socialAccountId: "account-1",
          codestraPostId: "post-1",
          contentFingerprint: "changed",
        },
        "correlation-1",
        "cmd-1",
      ),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it("encodes direct read-back references", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(publication), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new CodestraSocialRuntimeClient("https://social.test", "token");

    await client.getByClientReference("tenant/a command", "correlation-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://social.test/v2/social/publications/by-client-reference/tenant%2Fa%20command",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects malformed successful responses", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ runtimePostId: "runtime-1" }), { status: 200 }),
    );
    const client = new CodestraSocialRuntimeClient("https://social.test", "token");

    await expect(client.getPost("runtime-1")).rejects.toBeInstanceOf(RuntimeRequestError);
  });
});
