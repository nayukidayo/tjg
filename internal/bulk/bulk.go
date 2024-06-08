package bulk

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/nayukidayo/tjg/internal/db"
	"github.com/nayukidayo/tjg/pkg/env"
)

type Bulk struct {
	mu      sync.Mutex
	store   []raw
	size    int
	timeout time.Duration
	timer   *time.Timer
}

func New() *Bulk {
	bs := env.GetInt("BATCH_SIZE", 50)
	bt := env.GetDur("BATCH_TIMEOUT", "10s")
	return &Bulk{
		store:   make([]raw, 0, bs),
		size:    bs,
		timeout: bt,
	}
}

type raw struct {
	Type      json.RawMessage `json:"type"`
	Device    json.RawMessage `json:"device"`
	Data      json.RawMessage `json:"data"`
	TS        int64           `json:"ts"`
	Timestamp int64           `json:"_timestamp"`
}

func (b *Bulk) Write(data []byte) error {
	b.mu.Lock()
	defer b.mu.Unlock()

	var r raw
	if err := json.Unmarshal(data, &r); err != nil {
		return err
	}
	r.Timestamp = 1000 * r.TS

	b.store = append(b.store, r)
	if len(b.store) >= b.size {
		b.timer.Stop()
		return b.flush()
	}

	if b.timer == nil {
		b.timer = time.AfterFunc(b.timeout, func() {
			b.Flush()
		})
	}

	return nil
}

func (b *Bulk) flush() error {
	if len(b.store) == 0 {
		return nil
	}
	data, err := json.Marshal(b.store)
	if err != nil {
		return err
	}
	if err = db.Write(data); err != nil {
		return err
	}
	b.store = b.store[:0]
	if b.timer != nil {
		b.timer.Stop()
		b.timer = nil
	}
	return nil
}

func (b *Bulk) Flush() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.flush()
}
