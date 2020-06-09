package adapters

import (
	"fmt"
	"math"

	"github.com/smartcontractkit/chainlink/core/services/vrf"
	"github.com/smartcontractkit/chainlink/core/store"
	"github.com/smartcontractkit/chainlink/core/store/models"
	"github.com/smartcontractkit/chainlink/core/store/models/vrfkey"
	"github.com/smartcontractkit/chainlink/core/utils"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/pkg/errors"
	"github.com/tidwall/gjson"
)

// Random adapter type implements VRF calculation in its Perform method.
//
// The VRFCoordinator.sol contract and its integration with the chainlink node
// will handle interaction with the Random adapter, but if you need to interact
// with it directly, its input to should be a JSON object with "preSeed",
// "blockHash", "blockNum", and "keyHash" fields containing, respectively,
//
// - The input seed as a hex-represented uint256 (this is the preSeed generated
//   by VRFCoordinator#requestRandomness)
// - The hex-represented hash of the block in which request appeared
// - The number of the block in which the request appeared, as a JSON number
// - The keccak256 hash of the UNCOMPRESSED REPRESENTATION(*) of the public key
//
// E.g., given the input
//
//   {
//     "preSeed":
//       "0x0000000000000000000000000000000000000000000000000000000000000001",
//     "blockHash":
//       "0x31dcb7c2e3f80ce552bf730d5c1a7ed7f9b42c17aff254729b5be081394617e6",
//     "blockNum": 10000000,
//     "keyHash":
//       "0xc0a6c424ac7157ae408398df7e5f4552091a69125d5dfcb7b8c2659029395bdf",
//   }
//
// The adapter will return a proof for the VRF output given these values, as
// long as the keccak256 hash of its public key matches the hash in the input.
// Otherwise, it will error.
//
// The seed which is actually passed to the VRF cryptographic module is
// controlled by vrf.FinalSeed, and is computed from the above inputs.
//
// The adapter returns the hex representation of a solidity bytes array suitable
// for passing to VRFCoordinator#fulfillRandomnessRequest, a
// vrf.MarshaledOnChainResponse.
//
// (*) I.e., the 64-byte concatenation of the point's x- and y- ordinates as
// uint256's
type Random struct {
	// Compressed hex representation public key used in Random's VRF proofs
	//
	// This is just a hex string because Random is instantiated by json.Unmarshal.
	// (See adapters.For function.)
	PublicKey string `json:"publicKey"`
}

// TaskType returns the type of Adapter.
func (ra *Random) TaskType() models.TaskType {
	return TaskTypeRandom
}

// Perform returns the the proof for the VRF output given seed, or an error.
func (ra *Random) Perform(input models.RunInput, store *store.Store) models.RunOutput {
	key, preSeed, blockHash, blockNum, err := getInputs(ra, input, store)
	if err != nil {
		return models.NewRunOutputError(err)
	}
	solidityProof, err := store.VRFKeyStore.GenerateProof(key, preSeed,
		*blockHash, *blockNum)
	if err != nil {
		return models.NewRunOutputError(err)
	}
	ethereumByteArray := fmt.Sprintf("0x%x", utils.EVMEncodeBytes(solidityProof[:]))
	return models.NewRunOutputCompleteWithResult(ethereumByteArray)
}

// getInputs parses the JSON input for the values needed by the random adapter,
// or returns an error.
func getInputs(ra *Random, input models.RunInput, store *store.Store) (
	key *vrfkey.PublicKey, preSeed *vrf.Seed, blockHash *common.Hash,
	blockNum *uint64, err error) {
	key, err = getKey(ra, input)
	if err != nil {
		return nil, nil, nil, nil, errors.Wrapf(err, "bad key for vrf task")
	}
	preSeed, err = getPreSeed(input)
	if err != nil {
		return nil, nil, nil, nil, errors.Wrap(err, "bad seed for vrf task")
	}
	blockHash, blockNum, err = getBlockData(input)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	return key, preSeed, blockHash, blockNum, nil
}

// getBlockData parses the block-related data from the JSON input
func getBlockData(input models.RunInput) (
	blockHash *common.Hash, blockNum *uint64, err error) {
	hashBytes, err := extractHex(input, "blockHash")
	if err != nil {
		return nil, nil, errors.Wrap(err, "bad blockHash for vrf task")
	}
	bHash := common.BytesToHash(hashBytes)

	rawBlockNum := input.Data().Get("blockNum")
	if rawBlockNum.Type != gjson.Number {
		return nil, nil, errors.Errorf("blockNum field has no number: %+v",
			rawBlockNum)
	}
	if rawBlockNum.Float() >= math.MaxUint64 {
		return nil, nil, errors.Errorf("blockNum %f too big for Int64",
			rawBlockNum.Float())
	}
	directBlockNum := uint64(rawBlockNum.Float())
	if float64(directBlockNum) != rawBlockNum.Float() {
		return nil, nil, errors.Errorf("blockNum %f is not a natural number",
			rawBlockNum.Float())
	}
	return &bHash, &directBlockNum, nil
}

// getPreSeed returns the numeric seed for the vrf task, or an error
func getPreSeed(input models.RunInput) (*vrf.Seed, error) {
	rawSeed, err := extractHex(input, "seed")
	if err != nil {
		return nil, err
	}
	rv, err := vrf.BytesToSeed(rawSeed)
	if err != nil {
		return nil, err
	}
	return rv, nil
}

// getKey returns the public key for the VRF, or an error.
func getKey(ra *Random, input models.RunInput) (*vrfkey.PublicKey, error) {
	inputKeyHash, err := extractHex(input, "keyHash")
	if err != nil {
		return nil, err
	}
	key, err := vrfkey.NewPublicKeyFromHex(ra.PublicKey)
	if err != nil {
		return nil, errors.Wrapf(err, "could not parse %v as public key", ra.PublicKey)
	}
	keyHash, err := key.Hash()
	if err != nil {
		return nil, errors.Wrapf(err, "could not compute %v' hash", ra.PublicKey)
	}

	if keyHash != common.BytesToHash(inputKeyHash) {
		return nil, fmt.Errorf(
			"this task's keyHash %x does not match the input hash %x", keyHash, inputKeyHash)
	}
	return key, nil
}

// extractHex returns the bytes corresponding to the string input at the key
// field, or an error if the string cannot be interpreted as a hex string or
// represents more than 32 bytes
func extractHex(input models.RunInput, key string) ([]byte, error) {
	rawValue := input.Data().Get(key)
	if rawValue.Type != gjson.String {
		return nil, fmt.Errorf("%s %#+v is not a hex string", key, rawValue)
	}
	if len(rawValue.String()) > 66 {
		return nil, fmt.Errorf("%s should be a hex string representing at most "+
			"32 bytes", rawValue.String())
	}
	return hexutil.Decode(rawValue.String())
}
