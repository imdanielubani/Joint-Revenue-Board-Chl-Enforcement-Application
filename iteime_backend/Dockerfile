# iteime_backend image, the same for staging and production; each
# deployment differs only in its environment variables (see deploy/).
#
#   docker build -t iteime-backend .
#   docker run --env-file deploy/staging.env -p 4000:4000 iteime-backend

# ---- Build: compile TypeScript
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- Run: compiled code and production dependencies only
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist

# Never run as root.
USER node
EXPOSE 4000

# The server migrates the database at start-up, then listens.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" > /dev/null || exit 1

CMD ["node", "dist/server.js"]
