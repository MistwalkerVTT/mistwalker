FROM node:22-slim

WORKDIR /app

# Install dependencies (including devDependencies for Vite + esbuild)
COPY package.json package-lock.json ./
RUN npm install --include=dev

# Copy full application source and static/upload assets
COPY . .

# Build frontend (Vite) and backend (esbuild -> dist/server.cjs)
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
