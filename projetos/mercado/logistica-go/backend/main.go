package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
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

type StreamPayload struct {
	Type        string `json:"type"`
	At          string `json:"at,omitempty"`
	ID          string `json:"id,omitempty"`
	Driver      string `json:"driver,omitempty"`
	Vehicle     string `json:"vehicle,omitempty"`
	Origin      string `json:"origin,omitempty"`
	Destination string `json:"destination,omitempty"`
	Status      string `json:"status,omitempty"`
	ETA         int    `json:"eta,omitempty"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var (
	clients   = make(map[*websocket.Conn]struct{})
	clientsMu sync.Mutex
)

func health(w http.ResponseWriter, _ *http.Request) {
	clientsMu.Lock()
	connected := len(clients)
	clientsMu.Unlock()

	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":        true,
		"connected": connected,
	})
}

func stream(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "upgrade failed", http.StatusBadRequest)
		return
	}

	registerClient(conn)
	defer func() {
		unregisterClient(conn)
		_ = conn.Close()
	}()

	_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	conn.SetPongHandler(func(_ string) error {
		_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		return nil
	})

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}

func main() {
	rand.Seed(time.Now().UnixNano())

	go runBroadcaster()

	http.HandleFunc("/health", health)
	http.HandleFunc("/ws/events", stream)

	log.Println("Logistica API running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func runBroadcaster() {
	heartbeatTicker := time.NewTicker(5 * time.Second)
	eventTicker := time.NewTicker(7 * time.Second)
	pingTicker := time.NewTicker(20 * time.Second)
	defer heartbeatTicker.Stop()
	defer eventTicker.Stop()
	defer pingTicker.Stop()

	for {
		select {
		case <-heartbeatTicker.C:
			broadcast(StreamPayload{
				Type: "heartbeat",
				At:   time.Now().Format(time.RFC3339),
			})
		case <-eventTicker.C:
			event := generateEvent()
			broadcast(StreamPayload{
				Type:        "event",
				ID:          event.ID,
				Driver:      event.Driver,
				Vehicle:     event.Vehicle,
				Origin:      event.Origin,
				Destination: event.Destination,
				Status:      event.Status,
				ETA:         event.ETA,
			})
		case <-pingTicker.C:
			pingClients()
		}
	}
}

func generateEvent() Event {
	drivers := []string{"Rodrigo", "Luana", "Marcos", "Fernanda", "Iago"}
	vehicles := []string{"VAN-2041", "TRK-9910", "VAN-1183", "TRK-4302", "VAN-7712"}
	origins := []string{"CD Porto Alegre", "CD Canoas", "CD Gravatai", "CD Esteio"}
	destinations := []string{"Canoas", "Novo Hamburgo", "Sao Leopoldo", "Esteio", "Sapucaia"}
	statuses := []string{"route", "delayed", "done"}

	status := statuses[rand.Intn(len(statuses))]
	eta := rand.Intn(75) + 10
	if status == "done" {
		eta = 0
	}

	return Event{
		ID:          fmt.Sprintf("evt-%d", time.Now().UnixNano()),
		Driver:      drivers[rand.Intn(len(drivers))],
		Vehicle:     vehicles[rand.Intn(len(vehicles))],
		Origin:      origins[rand.Intn(len(origins))],
		Destination: destinations[rand.Intn(len(destinations))],
		Status:      status,
		ETA:         eta,
	}
}

func registerClient(conn *websocket.Conn) {
	clientsMu.Lock()
	defer clientsMu.Unlock()
	clients[conn] = struct{}{}
}

func unregisterClient(conn *websocket.Conn) {
	clientsMu.Lock()
	defer clientsMu.Unlock()
	delete(clients, conn)
}

func broadcast(payload StreamPayload) {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	for conn := range clients {
		if err := conn.WriteJSON(payload); err != nil {
			_ = conn.Close()
			delete(clients, conn)
		}
	}
}

func pingClients() {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	for conn := range clients {
		if err := conn.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(3*time.Second)); err != nil {
			_ = conn.Close()
			delete(clients, conn)
		}
	}
}
