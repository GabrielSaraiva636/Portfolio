package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

type Event struct {
	ID          string `json:"id"`
	Driver      string `json:"driver"`
	Vehicle     string `json:"vehicle"`
	Origin      string `json:"origin"`
	Destination string `json:"destination"`
	Status      string `json:"status"`
	ETA         int    `json:"eta"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func health(w http.ResponseWriter, _ *http.Request) {
	_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func stream(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "upgrade failed", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		payload := Event{
			ID:          "event-demo",
			Driver:      "Rodrigo",
			Vehicle:     "VAN-2041",
			Origin:      "CD Porto Alegre",
			Destination: "Canoas",
			Status:      "route",
			ETA:         45,
		}
		if err := conn.WriteJSON(payload); err != nil {
			break
		}
	}
}

func main() {
	http.HandleFunc("/health", health)
	http.HandleFunc("/ws/events", stream)

	log.Println("Logistica API running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
