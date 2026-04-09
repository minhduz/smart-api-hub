FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY schema.json .
COPY swagger.json .

EXPOSE 3000

CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]