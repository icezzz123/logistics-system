package middleware

import (
	"fmt"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

// RecoveryMiddleware 异常恢复中间件
func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// 打印错误信息
				fmt.Printf("Panic recovered: %v\n", err)

				// 返回错误响应
				utils.InternalServerError(c, "服务器内部错误")
				c.Abort()
			}
		}()
		c.Next()
	}
}
