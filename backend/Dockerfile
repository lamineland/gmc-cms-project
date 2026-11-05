FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p uploads logs && chown -R node:node /app
USER node
EXPOSE 5055
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:5055/health || exit 1
CMD ["node", "server.js"]
