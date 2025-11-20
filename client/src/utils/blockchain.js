import { ethers } from 'ethers';

// Address of the deployed contract (Update this after deployment)
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
import WorkoutLedgerArtifact from '../../../blockchain/artifacts/contracts/WorkoutLedger.sol/WorkoutLedger.json';

export const connectWallet = async () => {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    return null;
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return signer;
};

export const logWorkoutOnChain = async (workoutData) => {
  const signer = await connectWallet();
  if (!signer) return;

  const contract = new ethers.Contract(CONTRACT_ADDRESS, WorkoutLedgerArtifact.abi, signer);
  const tx = await contract.logWorkout(workoutData);
  await tx.wait();
  return tx.hash;
};