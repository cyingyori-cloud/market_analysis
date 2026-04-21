FROM node:20-slim

WORKDIR /app

# 复制 package.json
COPY server/package*.json ./

# 安装所有依赖（包括 devDependencies）
RUN npm install

# 复制后端代码
COPY server/ ./

# 暴露端口
EXPOSE 3001

# 启动命令（使用 tsx 运行 TypeScript）
CMD ["npx", "tsx", "index.ts"]
