# Proyecta backend — configuración local
# Copia este archivo a .env antes de correr el servidor:
#   cp .env.example .env
DATABASE_URL="file:./proyecta.db"
JWT_SECRET="dev-proyecta-secret-change-me-in-prod"
PORT=4000
# Contraseña con la que se siembran todas las cuentas demo
SEED_PASSWORD="proyecta123"
# Asistente IA (Inteligencia Académica Premium). Corre sobre Claude Haiku 4.5
# (Anthropic). Clave: console.anthropic.com → API Keys. Sin ella, la
# analítica funciona pero el chat IA responde "no configurado".
ANTHROPIC_API_KEY=""
# Modelo a usar (opcional). Por defecto claude-haiku-4-5.
# AI_MODEL="claude-haiku-4-5"
