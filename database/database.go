package database

import (
	"fmt"
	"log"
	"logistics-system/config"
	"logistics-system/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB(cfg *config.Config) error {
	var err error

	dsn := cfg.Database.DSN()

	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		return fmt.Errorf("failed to connect database: %w", err)
	}

	// 配置连接池
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// 设置连接池参数
	sqlDB.SetMaxIdleConns(10)          // 最大空闲连接数
	sqlDB.SetMaxOpenConns(100)         // 最大打开连接数
	sqlDB.SetConnMaxLifetime(3600 * 1) // 连接最大生命周期(1小时)

	log.Println("Database connected successfully")

	// 自动迁移数据库表
	if err := AutoMigrate(); err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	return nil
}

// CloseDB 关闭数据库连接
func CloseDB() error {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}

// AutoMigrate 自动迁移数据库表
func AutoMigrate() error {
	return DB.AutoMigrate(
		// 用户管理
		&models.User{},

		// 订单管理
		&models.Order{},
		&models.OrderPackage{},
		&models.SignRecord{},
		&models.OrderStatusLog{},

		// 站点管理
		&models.Station{},
		&models.StationFlow{},
		&models.Warehouse{},
		&models.Inventory{},
		&models.InventoryCheck{},
		&models.InventoryCheckDetail{},

		// 分拣管理
		&models.SortingRule{},
		&models.SortingTask{},
		&models.SortingRecord{},

		// 运输管理
		&models.Vehicle{},
		&models.TransportTask{},
		&models.BatchSchedule{},
		&models.TransportPlan{},
		&models.TransportPlanOrder{},
		&models.DeliveryRecord{},

		// 追踪管理
		&models.TrackingRecord{},
		&models.ExceptionRecord{},
	)
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return DB
}
