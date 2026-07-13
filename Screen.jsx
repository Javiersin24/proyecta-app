{
  "name": "proyecta-server",
  "version": "0.1.0",
  "description": "Backend de Proyecta — plataforma educativa para colegios (Teams + Classroom + proyección + ERP)",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "db:push": "prisma db push",
    "db:seed": "node prisma/seed.js",
    "db:reset": "prisma db push --force-reset && node prisma/seed.js",
    "setup": "prisma generate && prisma db push && node prisma/seed.js"
  },
  "prisma": {
    "seed": "node prisma/seed.js"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^17.4.2",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.2.0",
    "openai": "^4.104.0"
  },
  "devDependencies": {
    "prisma": "^5.22.0"
  }
}
