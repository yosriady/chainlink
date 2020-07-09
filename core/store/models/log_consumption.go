package models

import (
	"time"

	"github.com/ethereum/go-ethereum/common"
)

// A LogConsumption is a unique record indicating that a particular job has
// already consumed a particular log. This record can be used to prevent consumers
// from re-processing duplicate logs
type LogConsumption struct {
	ID        uint
	BlockHash common.Hash
	LogIndex  uint
	JobID     *ID
	CreatedAt time.Time
}

// NewLogConsumption creates a new LogConsumption
func NewLogConsumption(log RawLog, jobID *ID) LogConsumption {
	return LogConsumption{
		BlockHash: log.GetBlockHash(),
		LogIndex:  log.GetIndex(),
		JobID:     jobID,
	}
}
