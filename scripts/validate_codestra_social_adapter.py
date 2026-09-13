from pathlib import Path

CLIENT = Path("integrations/codestra-social/client.ts")
CLIENT_TEST = Path("integrations/codestra-social/client.spec.ts")
COMPOSE = Path("deploy/staging/compose.yaml")
CADDY = Path("deploy/staging/Caddyfile")
PROMETHEUS = Path("monitoring/prometheus.staging.yml")
SECRET_ENV = Path("var/docker/secret-env.mjs")
POLICY = Path("governance/release-policy.json")


def main() -> None:
    text = CLIENT.read_text(encoding="utf-8")
    lower = text.lower()
    assert "authorization" in lower and "bearer" in lower
    assert "x-correlation-id" in lower
    assert "idempotency-key" in lower
    assert "clientreference" in lower and "contentfingerprint" in lower
    assert "by-client-reference" in lower
    assert "idempotency_conflict" in lower
    assert 'method: "post"' in lower and 'method: "get"' in lower
    assert "social_publishing_disabled" in lower
    assert "abortcontroller" in lower
    assert "runtimerequesterror" in lower
    assert "publish_not_implemented_until_stage5_approval" not in lower
    assert "facebook.com" not in lower and "graph.facebook.com" not in lower

    tests = CLIENT_TEST.read_text(encoding="utf-8")
    for behavior in (
        "keeps publishing fail-closed",
        "stable identity headers",
        "conflicting replays",
        "direct read-back",
        "malformed successful responses",
    ):
        assert behavior in tests

    compose = COMPOSE.read_text(encoding="utf-8")
    assert "PUBLISHING_KILL_SWITCH: 'true'" in compose
    assert "SOCIAL_PUBLISH: 'false'" in compose
    assert "SOCIAL_PROVIDER_WRITES: 'false'" in compose
    assert "var/docker/secret-env.mjs" in compose
    assert "http://127.0.0.1:5000/" in compose
    assert "3000:3000" not in compose and "9090:9090" not in compose

    caddy = CADDY.read_text(encoding="utf-8")
    assert "reverse_proxy application:5000" in caddy
    assert "reverse_proxy application:3000" not in caddy

    prometheus = PROMETHEUS.read_text(encoding="utf-8")
    assert "targets: ['application:5000']" in prometheus
    assert "metrics_path: /api/metrics" in prometheus

    secret_env = SECRET_ENV.read_text(encoding="utf-8")
    assert "'DATABASE_URL'" in secret_env
    assert "delete process.env[fileVariable]" in secret_env
    assert POLICY.exists()
    print("SOCIAL_RUNTIME_ADAPTER_STAGE5_CERTIFICATION=PASS")


if __name__ == "__main__":
    main()
