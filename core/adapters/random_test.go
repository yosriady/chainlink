package adapters_test

import (
	"math/big"
	"testing"

	"github.com/smartcontractkit/chainlink/core/adapters"
	"github.com/smartcontractkit/chainlink/core/internal/cltest"
	"github.com/smartcontractkit/chainlink/core/services/vrf"
	"github.com/smartcontractkit/chainlink/core/store/models"
	"github.com/smartcontractkit/chainlink/core/utils"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRandom_Perform(t *testing.T) {
	store, cleanup := cltest.NewStore(t)
	defer cleanup()
	publicKey := cltest.StoredVRFKey(t, store)
	adapter := adapters.Random{PublicKey: publicKey.String()}
	hash := utils.MustHash("a random string")
	blockNum := 10
	jsonInput, err := models.JSON{}.MultiAdd(models.KV{
		"seed":      "0x10",
		"keyHash":   publicKey.MustHash().Hex(),
		"blockHash": hash.Hex(),
		"blockNum":  blockNum,
	})
	require.NoError(t, err) // Can't fail
	input := models.NewRunInput(&models.ID{}, models.ID{}, jsonInput, models.RunStatusUnstarted)
	result := adapter.Perform(*input, store)
	require.NoError(t, result.Error(), "while running random adapter")
	proof := hexutil.MustDecode(result.Result().String())
	// Check response is a valid vrf.MarshaledOnChainResponse
	length := big.NewInt(0).SetBytes(proof[:utils.EVMWordByteLen]).Uint64()
	require.Equal(t, length, uint64(len(proof)-utils.EVMWordByteLen))
	rawOnChainResponse := proof[utils.EVMWordByteLen:] // Skip initial length word
	var onChainResponse vrf.MarshaledOnChainResponse
	require.Equal(t, copy(onChainResponse[:], rawOnChainResponse),
		vrf.OnChainResponseLength, "wrong response length")
	response, err := vrf.UnmarshalProofResponse(onChainResponse)
	require.NoError(t, err, "random adapter produced bad proof response")
	actualProof, err := response.ActualProof(hash)
	require.NoError(t, err, "could not verify proof from random adapter")
	expected := common.HexToHash(
		"0x71a7c50918feaa753485ae039cb84ddd70c5c85f66b236138dea453a23d0f27e")
	assert.Equal(t, expected, common.BigToHash(actualProof.Output),
		"unexpected VRF output; perhas vrfkey.json or the output hashing function "+
			"in RandomValueFromVRFProof has changed?")
	jsonInput, err = jsonInput.Add("keyHash", common.Hash{})
	require.NoError(t, err)
	input = models.NewRunInput(&models.ID{}, models.ID{}, jsonInput, models.RunStatusUnstarted)
	result = adapter.Perform(*input, store)
	require.Error(t, result.Error(), "must reject if keyHash doesn't match")
}
