package spa

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/nats-io/nats.go"
	"github.com/nayukidayo/tjg/internal/db"
	"github.com/nayukidayo/tjg/pkg/env"
	"github.com/nayukidayo/tjg/ui"
)

func Server(nc *nats.Conn) {
	addr := env.GetStr("API_ADDR", ":54327")
	http.HandleFunc("GET /api/data/live", handleLive(nc))
	http.HandleFunc("POST /api/data/history", handleHistory())
	http.HandleFunc("GET /{file...}", handleFS())
	log.Println("SPA", addr)
	log.Fatalln(http.ListenAndServe(addr, nil))
}

func handleFS() http.HandlerFunc {
	dist, _ := ui.DistFS()
	return func(w http.ResponseWriter, r *http.Request) {
		var cc string
		f, err := dist.Open(r.PathValue("file"))
		if err == nil {
			f.Close()
			cc = "max-age=1209600, stale-while-revalidate=86400"
		} else {
			r.URL.Path = "/"
			cc = "no-cache"
		}
		w.Header().Set("Cache-Control", cc)
		http.FileServerFS(dist).ServeHTTP(w, r)
	}
}

func handleLive(nc *nats.Conn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ch := make(chan *nats.Msg, 64)
		sub, err := nc.ChanSubscribe("tjg.*", ch)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-store")
		for v := range ch {
			w.Write([]byte("data:"))
			w.Write(v.Data)
			w.Write([]byte("\n\n"))
			err := http.NewResponseController(w).Flush()
			if err != nil {
				break
			}
		}
		sub.Unsubscribe()
	}
}

func handleHistory() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var q db.Query
		if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		// TODO: 校验参数
		data, err := db.Read(q)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
	}
}
