package main

import (
	"fmt"
	"net/http"
	"sync"
	"time"
)

type Result struct {
	URL          string
	StatusCode   int
	ResponseTime time.Duration
	Err          error
}

func checkURL(url string, client *http.Client) Result {
	start := time.Now()

	resp, err := client.Get(url)
	duration := time.Since(start)

	if err != nil {
		return Result{
			URL:          url,
			StatusCode:   0,
			ResponseTime: duration,
			Err:          err,
		}
	}
	defer resp.Body.Close()

	return Result{
		URL:          url,
		StatusCode:   resp.StatusCode,
		ResponseTime: duration,
		Err:          nil,
	}
}

func pingAll(urls []string, client *http.Client) {
	var wg sync.WaitGroup
	results := make(chan Result, len(urls))

	fmt.Printf("\n[Проверка запущенa: %s]\n", time.Now().Format("15:04:05"))

	for _, url := range urls {
		wg.Add(1)
		go func(u string) {
			defer wg.Done()
			res := checkURL(u, client)
			results <- res
		}(url)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	for res := range results {
		if res.Err != nil {
			fmt.Printf("[%s] Ошибка: %v (Задержка: %v)\n", res.URL, res.Err, res.ResponseTime.Round(time.Millisecond))
		} else {
			fmt.Printf("[%s] Статус: %d | Задержка: %v\n", res.URL, res.StatusCode, res.ResponseTime.Round(time.Millisecond))
		}
	}
}

func main() {
	urls := []string{
		"https://google.com",
		"https://github.com",
		"https://yandex.ru",
		"https://httpbin.org/delay/2",
	}

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	pingAll(urls, client)

	for range ticker.C {
		pingAll(urls, client)
	}
}
