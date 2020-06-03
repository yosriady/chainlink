package vrf

// Contains logic/data for mandatorily mixing VRF seeds with the hash of the
// block in which a VRF request appeared

import (
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/pkg/errors"

	"github.com/smartcontractkit/chainlink/core/utils"
)

// FinalSeed(preSeed, blockHash) is the seed which is actually passed to the VRF
// proof generator, given the preseed and the hash of the block in which the
// VRFCoordinator emitted the log for the request this is responding to.
func FinalSeed(preSeed Seed, blockHash common.Hash) (finalSeed *big.Int) {
	seedHashMsg := append(preSeed[:], blockHash.Bytes()...)
	return utils.MustHash(string(seedHashMsg)).Big()
}

// ProofResponse is the data which is sent back to the VRFCoordinator, so that
// it can verify that the seed the oracle finally used is correct.
type ProofResponse struct {
	// Approximately the proof which will be checked on-chain. Note that this
	// contains the preseed in place of the final seed. That should be computed as
	// in FinalSeed.
	P        *Proof
	PreSeed  *Seed  // Seed received during VRF request
	BlockNum uint64 // Height of the block in which tihs request was made
}

// OnChainResponseLength is the length of the MarshaledOnChainResponse. The
// extra 32 bytes are for blocknumber (as a uint256), which goes at the end. The
// seed is rewritten with the preSeed. (See MarshalForVRFCoordinator and
// ProofResponse#ActualProof.)
const OnChainResponseLength = ProofLength + 32

// MarshaledOnChainResponse is the flat bytes which are sent back to the
// VRFCoordinator.
type MarshaledOnChainResponse [OnChainResponseLength]byte

// MarshalForVRFCoordinator constructs the flat bytes which are sent to the
// VRFCoordinator.
func (p *ProofResponse) MarshalForVRFCoordinator() (
	response *MarshaledOnChainResponse, err error) {
	solidityProof, err := p.P.SolidityPrecalculations()
	if err != nil {
		return nil, errors.Wrap(err, "while marshaling proof for VRFCoordinator")
	}
	// Overwrite seed input to the VRF proof generator with the seed the
	// VRFCoordinator originally requested, so that it can identify the request
	// corresponding to this response, and compute the final seed itself using the
	// blockhash it infers from the block number.
	solidityProof.P.Seed = common.BytesToHash(p.PreSeed[:]).Big()
	mProof := solidityProof.MarshalForSolidityVerifier()
	response = &MarshaledOnChainResponse{}
	wireBlockNum := utils.EVMWordUint64(p.BlockNum)
	rl := copy(response[:], append(mProof[:], wireBlockNum...))
	if rl != OnChainResponseLength {
		return nil, errors.Errorf("wrong length for response to VRFCoordinator")
	}
	return response, nil
}

// ParseProofResponse returns the ProofResponse represented by the bytes in m
func UnmarshalProofResponse(m MarshaledOnChainResponse) (*ProofResponse, error) {
	blockNum := common.BytesToHash(m[ProofLength : ProofLength+32]).Big().Uint64()
	proof, err := UnmarshalSolidityProof(m[:ProofLength])
	if err != nil {
		return nil, errors.Wrap(err, "while parsing ProofResponse")
	}
	preSeed, err := BigToSeed(proof.Seed)
	if err != nil {
		return nil, errors.Wrap(err, "while converting seed to bytes representation")
	}
	return &ProofResponse{P: &proof, PreSeed: preSeed, BlockNum: blockNum}, nil
}

// p.ActualProof returns the proof implied by p, with the correct seed
func (p *ProofResponse) ActualProof(blockHash common.Hash) (*Proof, error) {
	proof := *p.P // Copy P, which has wrong seed value
	proof.Seed = FinalSeed(*p.PreSeed, blockHash)
	valid, err := proof.VerifyVRFProof()
	if err != nil {
		return nil, errors.Wrap(err,
			"could not validate proof implied by on-chain response")
	}
	if !valid {
		return nil, errors.Errorf("proof implied by on-chain response is invalid")
	}
	return &proof, nil
}

func GenerateProofResponse(secretKey common.Hash, preSeed *Seed,
	blockHash common.Hash, blockNum uint64) (*MarshaledOnChainResponse, error) {
	seed := FinalSeed(*preSeed, blockHash)
	proof, err := GenerateProof(secretKey, common.BigToHash(seed))
	if err != nil {
		return nil, err
	}
	rv, err := (&ProofResponse{
		P: proof, PreSeed: preSeed, BlockNum: blockNum}).MarshalForVRFCoordinator()
	if err != nil {
		return nil, err
	}
	return rv, nil
}
