from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = (ROOT / "apps/frontend/src/app/(app)/auth/layout.tsx").read_text()
LOGIN = (ROOT / "apps/frontend/src/components/auth/login.tsx").read_text()
INPUT = (ROOT / "libraries/react-shared-libraries/src/form/input.tsx").read_text()
CSS = (ROOT / "apps/frontend/src/app/global.scss").read_text()

assert "codestra-auth-shell" in LAYOUT
assert "codestra-auth-panel" in LAYOUT
assert "codestra-login-form" in LOGIN
assert "codestra-login-submit" in LOGIN
assert "codestra-login-input" in INPUT
assert "--codestra-gold: #f4c223" in CSS
assert "--codestra-bg: #07080a" in CSS
assert "#55d6be" not in CSS
print("CODESTRA_SOCIAL_LOGIN_BRANDING=PASS")
