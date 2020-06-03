package vrf

import (
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/pkg/errors"

	"github.com/smartcontractkit/chainlink/core/utils"
)

// Seed represents a VRF seed as a serialized uint256
type Seed [32]byte

// BigToSeed(x) returns the seed x represented as a Seed, or an error if x is
// too big
func BigToSeed(x *big.Int) (*Seed, error) {
	seed, err := utils.Uint256ToBytes(x)
	if err != nil {
		return nil, err
	}
	rv := Seed(common.BytesToHash(seed))
	return &rv, nil
}

// s.Big() returns the uint256 seed represented by s
func (s *Seed) Big() *big.Int {
	return common.Hash(*s).Big()
}

// BytesToSeed returns the Seed corresponding to b, or an error if b is too long
func BytesToSeed(b []byte) (*Seed, error) {
	if len(b) > 32 {
		return nil, errors.Errorf("Seed representation can be at most 32 bytes, "+
			"got %d", len(b))
	}
	seed := Seed(common.BytesToHash(b))
	return &seed, nil
}
