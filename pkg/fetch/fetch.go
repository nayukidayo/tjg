package fetch

import (
	"crypto/tls"
	"errors"
	"io"
	"net/http"
	"time"
)

func Fetch(method string, url string, body io.Reader, header map[string]string) ([]byte, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}

	for k, v := range header {
		req.Header.Add(k, v)
	}

	client := &http.Client{
		Timeout: time.Duration(5 * time.Second),
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}

	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode > http.StatusIMUsed {
		return nil, errors.New(res.Status)
	}

	return io.ReadAll(res.Body)
}
