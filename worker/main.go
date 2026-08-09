package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type MetricDTO struct {
	URL          string `json:"url"`
	StatusCode   int    `json:"statusCode"`
	ResponseTime int64  `json:"responseTime"`
	Error        string `json:"error,omitempty"`
}

type NestEvent struct {
	Pattern string    `json:"pattern"`
	Data    MetricDTO `json:"data"`
}

type TargetDTO struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

type Result struct {
	URL          string
	StatusCode   int
	ResponseTime time.Duration
	Err          error
}

type Publisher struct {
	ch *amqp.Channel
}

func NewPublisher(amqpURL string) (*Publisher, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}

	_, err = ch.QueueDeclare("metrics_queue", true, false, false, false, nil)
	if err != nil {
		return nil, err
	}

	return &Publisher{ch: ch}, nil
}

func (p *Publisher) Publish(dto MetricDTO) error {
	event := NestEvent{
		Pattern: "metric_created",
		Data:    dto,
	}

	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return p.ch.PublishWithContext(
		ctx,
		"",
		"metrics_queue",
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
}

func getURLs(serverURL string, client *http.Client) []string {
	resp, err := client.Get(serverURL + "/targets")
	if err != nil {
		fmt.Printf("api connection error: %v\n", err)
		return nil
	}
	defer resp.Body.Close()

	var targets []TargetDTO
	if err := json.NewDecoder(resp.Body).Decode(&targets); err != nil {
		return nil
	}

	var urls []string
	for _, t := range targets {
		if t.URL != "" {
			urls = append(urls, t.URL)
		}
	}
	return urls
}

func checkURL(url string, client *http.Client) Result {
	start := time.Now()
	resp, err := client.Get(url)
	duration := time.Since(start)

	if err != nil {
		return Result{URL: url, StatusCode: 0, ResponseTime: duration, Err: err}
	}
	defer resp.Body.Close()

	return Result{URL: url, StatusCode: resp.StatusCode, ResponseTime: duration, Err: nil}
}

func pingAll(serverURL string, client *http.Client, pub *Publisher) {
	urls := getURLs(serverURL, client)
	if len(urls) == 0 {
		fmt.Printf("\n--- проверка: %s | нет сайтов для проверки ---\n", time.Now().Format("15:04:05"))
		return
	}

	var wg sync.WaitGroup
	results := make(chan Result, len(urls))

	fmt.Printf("\n--- проверка: %s | сайтов: %d ---\n", time.Now().Format("15:04:05"), len(urls))

	for _, url := range urls {
		wg.Add(1)
		go func(u string) {
			defer wg.Done()
			results <- checkURL(u, client)
		}(url)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	for res := range results {
		errStr := ""
		if res.Err != nil {
			errStr = res.Err.Error()
			fmt.Printf("[%s] err: %v\n", res.URL, res.Err)
		} else {
			fmt.Printf("[%s] %d | %v\n", res.URL, res.StatusCode, res.ResponseTime.Round(time.Millisecond))
		}

		dto := MetricDTO{
			URL:          res.URL,
			StatusCode:   res.StatusCode,
			ResponseTime: res.ResponseTime.Milliseconds(),
			Error:        errStr,
		}

		go func(d MetricDTO) {
			if err := pub.Publish(d); err != nil {
				fmt.Printf("rmq err: %v\n", err)
			}
		}(dto)
	}
}

func main() {
	amqpURL := os.Getenv("RABBITMQ_URL")
	if amqpURL == "" {
		amqpURL = "amqp://guest:guest@localhost:5672/"
	}

	serverURL := os.Getenv("SERVER_URL")
	if serverURL == "" {
		serverURL = "http://localhost:3001"
	}

	var pub *Publisher
	var err error

	for i := 0; i < 15; i++ {
		pub, err = NewPublisher(amqpURL)
		if err == nil {
			break
		}
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatalf("rmq connection failed: %v", err)
	}

	client := &http.Client{Timeout: 5 * time.Second}
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	pingAll(serverURL, client, pub)

	for range ticker.C {
		pingAll(serverURL, client, pub)
	}
}