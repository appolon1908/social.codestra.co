export type PublicationState =
  | "ACCEPTED"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELLED"
  | "UNKNOWN";

export type PublishRequest = {
  clientReference: string;
  socialAccountId: string;
  codestraPostId: string;
  contentFingerprint: string;
  scheduledAt?: string;
};

export type PublicationReadBack = {
  clientReference: string;
  socialAccountId: string;
  provider: string;
  codestraPostId: string;
  runtimePostId: string;
  providerPostId?: string;
  contentFingerprint: string;
  state: PublicationState;
  createdAt: string;
  updatedAt: string;
};

export class IdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT";

  constructor() {
    super("idempotency_conflict");
    this.name = "IdempotencyConflictError";
  }
}

export class RuntimeRequestError extends Error {
  constructor(
    readonly operation: string,
    readonly status?: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(`${operation}_failed${status === undefined ? "" : `:${status}`}`);
    this.name = "RuntimeRequestError";
  }
}

const requiredPublicationFields: Array<keyof PublicationReadBack> = [
  "clientReference",
  "socialAccountId",
  "provider",
  "codestraPostId",
  "runtimePostId",
  "contentFingerprint",
  "state",
  "createdAt",
  "updatedAt",
];

export class CodestraSocialRuntimeClient {
  private readonly normalizedBaseUrl: string;

  constructor(
    baseUrl: string,
    private readonly token: string,
    private readonly publishingEnabled = false,
    private readonly publishingKillSwitchOpen = false,
    private readonly timeoutMs = 10_000,
  ) {
    this.normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    if (!this.normalizedBaseUrl || !this.token) throw new Error("invalid_runtime_configuration");
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new Error("invalid_runtime_timeout");
    }
  }

  private headers(correlationId?: string, idempotencyKey?: string): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
      ...(correlationId ? { "X-Correlation-ID": correlationId } : {}),
      ...(idempotencyKey
        ? { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }
        : {}),
    };
  }

  private async request<T>(
    path: string,
    operation: string,
    init: RequestInit,
    validate?: (value: unknown) => T,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.normalizedBaseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
      if (response.status === 409) throw new IdempotencyConflictError();
      if (!response.ok) {
        const retryAfter = Number(response.headers.get("retry-after"));
        throw new RuntimeRequestError(
          operation,
          response.status,
          Number.isFinite(retryAfter) ? retryAfter : undefined,
        );
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new RuntimeRequestError(`${operation}_invalid_json`, response.status);
      }
      return validate ? validate(body) : (body as T);
    } catch (error) {
      if (error instanceof IdempotencyConflictError || error instanceof RuntimeRequestError) {
        throw error;
      }
      throw new RuntimeRequestError(
        error instanceof DOMException && error.name === "AbortError"
          ? `${operation}_timeout`
          : `${operation}_network`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private publication(value: unknown): PublicationReadBack {
    if (
      typeof value !== "object" ||
      value === null ||
      requiredPublicationFields.some(
        (field) => typeof (value as Record<string, unknown>)[field] !== "string",
      )
    ) {
      throw new RuntimeRequestError("runtime_invalid_publication");
    }
    return value as PublicationReadBack;
  }

  async getPost(runtimePostId: string, correlationId?: string): Promise<PublicationReadBack> {
    if (!runtimePostId) throw new Error("invalid_runtime_post_id");
    return this.request(
      `/v2/social/publications/${encodeURIComponent(runtimePostId)}`,
      "runtime_read",
      { method: "GET", headers: this.headers(correlationId) },
      (value) => this.publication(value),
    );
  }

  async getByClientReference(
    clientReference: string,
    correlationId?: string,
  ): Promise<PublicationReadBack> {
    if (!clientReference) throw new Error("invalid_client_reference");
    return this.request(
      `/v2/social/publications/by-client-reference/${encodeURIComponent(clientReference)}`,
      "runtime_readback",
      { method: "GET", headers: this.headers(correlationId) },
      (value) => this.publication(value),
    );
  }

  async getMetrics(runtimePostId: string, correlationId?: string): Promise<Record<string, number>> {
    if (!runtimePostId) throw new Error("invalid_runtime_post_id");
    return this.request(
      `/v2/social/publications/${encodeURIComponent(runtimePostId)}/metrics`,
      "runtime_metrics",
      { method: "GET", headers: this.headers(correlationId) },
    );
  }

  async publish(
    request: PublishRequest,
    correlationId: string,
    idempotencyKey: string,
  ): Promise<PublicationReadBack> {
    if (!this.publishingEnabled || !this.publishingKillSwitchOpen) {
      throw new Error("social_publishing_disabled");
    }
    if (
      !correlationId ||
      !idempotencyKey ||
      idempotencyKey !== request.clientReference ||
      !request.socialAccountId ||
      !request.codestraPostId ||
      !request.contentFingerprint
    ) {
      throw new Error("invalid_publish_identity");
    }

    return this.request(
      "/v2/social/publications",
      "runtime_publish",
      {
        method: "POST",
        headers: this.headers(correlationId, idempotencyKey),
        body: JSON.stringify(request),
      },
      (value) => this.publication(value),
    );
  }
}
