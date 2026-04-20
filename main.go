package main

import (
	"context"
	"fmt"
	"log"
	"logistics-system/config"
	"logistics-system/database"
	"logistics-system/middleware"
	"logistics-system/routes"
	"logistics-system/utils"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 加载.env文件
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using default values")
	}

	// 加载配置
	cfg := config.LoadConfig()

	// 设置Gin模式
	gin.SetMode(cfg.Server.Mode)

	// 初始化JWT
	utils.InitJWT(cfg.JWT.Secret)

	// 初始化数据库
	if err := database.InitDB(cfg); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// 初始化Redis（可选，开发环境可以不启动Redis）
	if err := database.InitRedis(cfg); err != nil {
		log.Println("Warning: Redis connection failed:", err)
		log.Println("Application will continue without Redis cache")
	}

	// 创建Gin引擎（不使用默认中间件）
	r := gin.New()

	// 使用自定义中间件
	r.Use(middleware.RecoveryMiddleware()) // 异常恢复
	r.Use(middleware.LoggerMiddleware())   // 日志记录
	r.Use(middleware.CORSMiddleware())     // 跨域处理

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Logistics System API is running",
		})
	})

	// 设置路由
	routes.SetupRoutes(r)

	// 创建HTTP服务器
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	srv := &http.Server{
		Addr:    addr,
		Handler: r,
	}

	// 在goroutine中启动服务器
	go func() {
		log.Printf("Server is running on http://localhost%s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// 等待中断信号以优雅地关闭服务器
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// 设置5秒的超时时间
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 关闭HTTP服务器
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	// 关闭数据库连接
	if err := database.CloseDB(); err != nil {
		log.Println("Error closing database:", err)
	}

	// 关闭Redis连接
	if err := database.CloseRedis(); err != nil {
		log.Println("Error closing redis:", err)
	}

	log.Println("Server exited")
}
