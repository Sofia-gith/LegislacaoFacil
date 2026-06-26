package gemini

import (
	"context"
	"errors"
)

type Client struct {
	apiKey string
}

func NewClient(apiKey string) (*Client, error) {
	if apiKey == "" {
		return nil, errors.New("gemini: api key is required")
	}
	return &Client{apiKey: apiKey}, nil
}

func (c *Client) Simplify(ctx context.Context, text string) (string, error) {
	if text == "" {
		return "", errors.New("gemini: text cannot be empty")
	}
	return "", errors.New("gemini: not implemented")
}
