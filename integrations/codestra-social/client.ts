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
  constructor() {
    super("idempotency_conflict");
  }
}

export class CodestraSocialRuntimeClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly publishingEnabled = false,
    private readonly publishingKillSwitchOpen = false,
  ) {}

  private headers(correlationId?: string, idempotencyKey?: string): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(correlationId ? { "X-Correlation-ID": correlationId } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    };
  }

  private async response<T>(response: Response, operation: string): Promise<T> {
    if (response.status === 409) throw new IdempotencyConflictError();
    if (!response.ok) throw new Error(`${operation}_failed:${response.status}`);
    return (await response.json()) as T;
  }

  async getPost(runtimePostId: string, correlationId?: string): Promise<PublicationReadBack> {
    const response = await fetch(
      `${this.baseUrl}/v2/social/publications/${encodeURIComponent(runtimePostId)}`,
      { method: "GET", headers: this.headers(correlationId) },
    );
    return this.response(response, "runtime_read");
  }

  async getByClientReference(
    clientReference: string,
    correlationId?: string,
  ): Promise<PublicationReadBack> {
    const response = await fetch(
      `${this.baseUrl}/v2/social/publications/by-client-reference/${encodeURIComponent(clientReference)}`,
      { method: "GET", headers: this.headers(correlationId) },
    );
    return this.response(response, "runtime_readback");
  }

  async getMetrics(runtimePostId: string, correlationId?: string): Promise<Record<string, number>> {
    const response = await fetch(
      `${this.baseUrl}/v2/social/publications/${encodeURIComponent(runtimePostId)}/metrics`,
      { method: "GET", headers: this.headers(correlationId) },
    );
    return this.response(response, "runtime_metrics");
  }

  async publish(
    request: PublishRequest,
    correlationId: string,
    idempotencyKey: string,
  ): Promise<PublicationReadBack> {
    if (!this.publishingEnabled || !this.publishingKillSwitchOpen) {
      throw new Error("social_publishing_disabled");
    }
    if (!correlationId || !idempotencyKey || idempotencyKey !== request.clientReference) {
      throw new Error("invalid_publish_identity");
    }
    const response = await fetch(`${this.baseUrl}/v2/social/publications`, {
      method: "POST",
      headers: this.headers(correlationId, idempotencyKey),
      body: JSON.stringify(request),
    });
    return this.response(response, "runtime_publish");
  }
}
