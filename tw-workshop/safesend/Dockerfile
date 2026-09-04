# syntax=docker/dockerfile:1

# --- build ------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies from the lockfile only, so the layer caches well.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts postcss.config.js tailwind.config.js index.html ./
COPY src ./src

# Type-check, run the risk-engine and state-machine suites, then build.
# A failing test fails the image build.
RUN npx tsc -b \
 && npx vitest run \
 && npx vite build

# --- serve ------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:3100/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
