from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app as fastapi_app  # noqa: E402


class StripApiPrefixMiddleware:
    """Remove o prefixo /api nas chamadas da Vercel para manter rotas idênticas ao ambiente local."""

    def __init__(self, asgi_app):
        self.asgi_app = asgi_app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            path = scope.get("path", "")
            if path == "/api":
                scope = dict(scope, path="/")
            elif path.startswith("/api/"):
                scope = dict(scope, path=path[4:])
        await self.asgi_app(scope, receive, send)


app = StripApiPrefixMiddleware(fastapi_app)
