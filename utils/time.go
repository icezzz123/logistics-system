package utils

import "time"

// FormatTimestamp 格式化Unix时间戳为字符串
func FormatTimestamp(timestamp int64) string {
	if timestamp == 0 {
		return ""
	}
	t := time.Unix(timestamp, 0)
	return t.Format("2006-01-02 15:04:05")
}

// ParseTimestamp 解析时间字符串为Unix时间戳
func ParseTimestamp(timeStr string) (int64, error) {
	if timeStr == "" {
		return 0, nil
	}
	t, err := time.Parse("2006-01-02 15:04:05", timeStr)
	if err != nil {
		return 0, err
	}
	return t.Unix(), nil
}

// GetCurrentTimestamp 获取当前Unix时间戳
func GetCurrentTimestamp() int64 {
	return time.Now().Unix()
}
