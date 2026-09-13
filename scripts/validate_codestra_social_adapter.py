from pathlib import Path

CLIENT = Path('integrations/codestra-social/client.ts')
COMPOSE = Path('deploy/staging/compose.yaml')
POLICY = Path('governance/release-policy.json')


def main() -> None:
    text = CLIENT.read_text(encoding='utf-8')
    lower = text.lower()
    assert 'authorization' in lower and 'bearer' in lower
    assert 'x-correlation-id' in lower
    assert 'idempotency-key' in lower
    assert 'clientreference' in lower and 'contentfingerprint' in lower
    assert 'by-client-reference' in lower
    assert 'idempotency_conflict' in lower
    assert 'method: "post"' in lower and 'method: "get"' in lower
    assert 'social_publishing_disabled' in lower
    assert 'publish_not_implemented_until_stage5_approval' not in lower
    assert 'facebook.com' not in lower and 'graph.facebook.com' not in lower

    compose = COMPOSE.read_text(encoding='utf-8')
    assert "PUBLISHING_KILL_SWITCH: 'true'" in compose
    assert "SOCIAL_PUBLISH: 'false'" in compose
    assert "SOCIAL_PROVIDER_WRITES: 'false'" in compose
    assert '3000:3000' not in compose and '9090:9090' not in compose
    assert POLICY.exists()
    print('SOCIAL_RUNTIME_ADAPTER_STAGE5_CERTIFICATION=PASS')


if __name__ == '__main__':
    main()
