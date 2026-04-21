FROM node:20-alpine

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 安装 tsx 用于运行 TypeScript
RUN npm install -g tsx

# 复制后端代码
COPY server ./server

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

# 使用 tsx 运行 TypeScript
CMD ["npx", "tsx", "server/index.ts"]
