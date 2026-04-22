FROM node:20-slim

WORKDIR /app

# 复制后端 package.json
COPY server/package*.json ./

# 安装依赖
RUN npm install

# 复制后端代码到 server/ 目录
COPY server/ ./server/

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["npx", "tsx", "server/index.ts"]
