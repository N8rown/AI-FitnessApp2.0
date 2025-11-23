import { ethers } from 'ethers';

// Fallback address (used if deployed.json not present)
const FALLBACK_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
import WorkoutLedgerArtifact from '../../../blockchain/artifacts/contracts/WorkoutLedger.sol/WorkoutLedger.json';

let cachedAddress = null;
export const getContractAddress = async () => {
  if (cachedAddress) return cachedAddress;
  try {
    const res = await fetch('/deployed.json');
    if (!res.ok) throw new Error('No deployed.json');
    const data = await res.json();
    cachedAddress = data.address || FALLBACK_CONTRACT_ADDRESS;
  } catch (e) {
    cachedAddress = FALLBACK_CONTRACT_ADDRESS;
  }
  return cachedAddress;
};

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

  const CONTRACT_ADDRESS = await getContractAddress();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, WorkoutLedgerArtifact.abi, signer);
  const tx = await contract.logWorkout(workoutData);
  await tx.wait();
  return tx.hash;
};