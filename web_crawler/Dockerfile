FROM node:22
# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install Chrome and dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome as default browser
RUN ln -s /usr/bin/chromium /usr/bin/chromium-browser

# Set Puppeteer configuration
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_CACHE_DIR=/root/.cache/puppeteer

# 安装pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 设置工作目录
WORKDIR /app

# Copy package files first
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application files, excluding node_modules
COPY src/ src/
COPY tsconfig.json ./

# 构建项目
RUN pnpm run build

# 暴露端口
EXPOSE 3011

# 启动命令
CMD ["node", "dist/app.js"] 