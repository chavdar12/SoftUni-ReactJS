# Build context: server/ (needs shared/ next to this service).
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production SERVICE=identity
COPY package*.json ./
RUN npm ci --omit=dev
COPY shared ./shared
COPY identity ./identity
USER node
EXPOSE 4000
EXPOSE 9464
CMD ["node", "--import", "./shared/src/tracing.ts", "identity/src/index.ts"]
