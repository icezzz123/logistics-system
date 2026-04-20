.PHONY: help build run clean test deps migrate

# 默认目标
help:
	@echo "可用命令:"
	@echo "  make build    - 编译项目"
	@echo "  make run      - 运行项目"
	@echo "  make clean    - 清理编译文件"
	@echo "  make test     - 运行测试"
	@echo "  make deps     - 下载依赖"
	@echo "  make migrate  - 运行数据库迁移"
	@echo "  make dev      - 开发模式运行（热重载）"

# 编译项目
build:
	@echo "正在编译..."
	@go build -o bin/logistics-system main.go
	@echo "编译完成: bin/logistics-system"

# 运行项目
run:
	@echo "正在启动服务..."
	@go run main.go

# 清理编译文件
clean:
	@echo "正在清理..."
	@rm -rf bin/
	@rm -rf logs/*.log
	@echo "清理完成"

# 运行测试
test:
	@echo "正在运行测试..."
	@go test -v ./...

# 下载依赖
deps:
	@echo "正在下载依赖..."
	@go mod download
	@go mod tidy
	@echo "依赖下载完成"

# 数据库迁移
migrate:
	@echo "正在执行数据库迁移..."
	@go run main.go migrate
	@echo "迁移完成"

# 开发模式（需要安装air: go install github.com/cosmtrek/air@latest）
dev:
	@echo "开发模式启动..."
	@air
