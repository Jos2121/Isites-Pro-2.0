FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm tsx
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod=false
ARG CACHEBUST=3
COPY . .
RUN pnpm exec vite build
EXPOSE 3000
CMD ["tsx", "src/worker/index.ts"]