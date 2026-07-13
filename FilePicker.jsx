# Proyecta backend — configuración local
# Copia este archivo a .env antes de correr el servidor:
#   cp .env.example .env
DATABASE_URL="file:./proyecta.db"
JWT_SECRET="dev-proyecta-secret-change-me-in-prod"
PORT=4000
# Contraseña con la que se siembran todas las cuentas demo
SEED_PASSWORD="proyecta123"
# Asistente IA (Inteligencia Académica Premium). Corre sobre Qwen 2.5 7B
# alojado en DeepInfra (API compatible con OpenAI). Clave: deepinfra.com →
# Dashboard → API Keys. Sin ella, la analítica funciona pero el chat IA
# responde "no configurado".
DEEPINFRA_API_KEY=""
# Modelo a usar (opcional). Por defecto Qwen/Qwen2.5-7B-Instruct.
# AI_MODEL="Qwen/Qwen2.5-7B-Instruct"
