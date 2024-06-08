package db

import (
	"bytes"
	"encoding/json"

	"github.com/nayukidayo/tjg/pkg/env"
	"github.com/nayukidayo/tjg/pkg/fetch"
)

var (
	DB_READ_URL  = env.GetStr("DB_READ_URL", "http://150.158.34.121:5080/api/tjg/_search")
	DB_WRITE_URL = env.GetStr("DB_WRITE_URL", "http://150.158.34.121:5080/api/tjg/default/_json")
	DB_TOKEN     = env.GetStr("DB_TOKEN", "bmF5dWtpZGF5b0AxNjMuY29tOm5heXVraWRheW8=")
)

type Query struct {
	Type   string `json:"type"`
	Device string `json:"device"`
	Start  int64  `json:"start"`
	End    int64  `json:"end"`
	From   int    `json:"from"`
	Size   int    `json:"size"`
}

func Read(q Query) ([]byte, error) {
	m := map[string]any{
		"query": map[string]any{
			"sql":              "SELECT * FROM default WHERE device='" + q.Device + "' AND type='" + q.Type + "'",
			"start_time":       q.Start,
			"end_time":         q.End,
			"from":             q.From,
			"size":             q.Size,
			"track_total_hits": true,
		},
	}
	param, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	header := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Basic " + DB_TOKEN,
	}
	return fetch.Fetch("POST", DB_READ_URL, bytes.NewReader(param), header)
}

func Write(data []byte) error {
	header := map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Basic " + DB_TOKEN,
	}
	_, err := fetch.Fetch("POST", DB_WRITE_URL, bytes.NewReader(data), header)
	if err != nil {
		return err
	}
	return nil
}
