package env

import (
	"os"
	"strconv"
	"time"
)

func GetStr(key string, val string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return val
}

func GetInt(key string, val int) int {
	if v, err := strconv.Atoi(os.Getenv(key)); err == nil {
		return v
	}
	return val
}

func GetBool(key string, val bool) bool {
	if v, err := strconv.ParseBool(os.Getenv(key)); err == nil {
		return v
	}
	return val
}

func GetDur(key string, val string) time.Duration {
	if v, err := time.ParseDuration(os.Getenv(key)); err == nil {
		return v
	}
	d, _ := time.ParseDuration(val)
	return d
}
