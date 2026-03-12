# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/react
COPY react/package*.json ./
RUN npm install
COPY react/ ./
RUN npm run build

# Stage 2: Set up the Node.js backend
FROM node:20-slim
WORKDIR /app

# Install system dependencies for Puppeteer and LibreOffice
RUN apt-get update && apt-get install -y \
    libreoffice \
    chromium \
    fonts-freefont-ttf \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    lsb-release \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use the system installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
COPY --from=frontend-builder /app/react/dist ../react/dist

# Create uploads and outputs directories
RUN mkdir -p uploads outputs

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
