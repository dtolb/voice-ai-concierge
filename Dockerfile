# ---- build ----
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=corp_ca \
    NODE_EXTRA_CA_CERTS=/run/secrets/corp_ca npm ci
COPY web ./web
RUN npm run build

# ---- runtime ----
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production DATABASE_PATH=/app/data/database.json PORT=8000
COPY package*.json ./
RUN --mount=type=secret,id=corp_ca \
    NODE_EXTRA_CA_CERTS=/run/secrets/corp_ca npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 8000
CMD ["node", "--experimental-strip-types", "server/src/main.ts"]
