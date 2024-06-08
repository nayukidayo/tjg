package forward

import (
	"bytes"

	"github.com/nayukidayo/tjg/pkg/env"
	"github.com/nayukidayo/tjg/pkg/fetch"
)

var (
	url    = env.GetStr("FORWARD_URL", "")
	header = map[string]string{"Content-Type": "application/json"}
)

func Send(data []byte) {
	fetch.Fetch("POST", url, bytes.NewReader(data), header)
}
