# Stage 1 — build the Vite app
FROM node:20-alpine AS builder

# Declare build arguments that will be passed as env vars
ARG VITE_POLL_INTERVAL_MS=86400000
ARG VITE_WEBHOOK_URL
ARG VITE_STALE_THRESHOLD_MS=300000

# Set them as environment variables for the build
ENV VITE_POLL_INTERVAL_MS=$VITE_POLL_INTERVAL_MS
ENV VITE_WEBHOOK_URL=$VITE_WEBHOOK_URL
ENV VITE_STALE_THRESHOLD_MS=$VITE_STALE_THRESHOLD_MS

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Remove .env file to prevent it from overriding ENV vars
RUN rm -f .env .env.local .env.production .env.production.local
RUN npm run build

# Stage 2 — serve the static dist/ with nginx
FROM nginx:1.25-alpine AS runner

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# OpenShift runs containers as a random non-root UID, so we need
# nginx writable dirs to be group-accessible (group 0 = root group)
RUN chown -R nginx:0 /usr/share/nginx/html \
    /var/cache/nginx \
    /var/log/nginx \
    /var/run \
    /etc/nginx/conf.d \
 && chmod -R g+rwX /var/cache/nginx /var/log/nginx /var/run /etc/nginx/conf.d

# nginx config: serve SPA (all routes → index.html) on port 8080
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
USER 1001

CMD ["nginx", "-g", "daemon off;"]
