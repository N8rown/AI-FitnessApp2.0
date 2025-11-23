const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const workoutLedger = await hre.ethers.deployContract("WorkoutLedger");

  await workoutLedger.waitForDeployment();

  console.log(`WorkoutLedger deployed to ${workoutLedger.target}`);

  // Write deployed address to client public folder so the frontend can read it at runtime
  try {
    const out = {
      address: workoutLedger.target,
      network: hre.network.name || 'localhost'
    };
    const clientPublicPath = path.resolve(__dirname, '..', '..', 'client', 'public');
    if (!fs.existsSync(clientPublicPath)) fs.mkdirSync(clientPublicPath, { recursive: true });
    const dest = path.join(clientPublicPath, 'deployed.json');
    fs.writeFileSync(dest, JSON.stringify(out, null, 2));
    console.log(`Wrote deployed address to ${dest}`);
  } catch (err) {
    console.warn('Failed to write deployed info to client public folder:', err.message || err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});