const hre = require("hardhat");

async function main() {
  const workoutLedger = await hre.ethers.deployContract("WorkoutLedger");

  await workoutLedger.waitForDeployment();

  console.log(
    `WorkoutLedger deployed to ${workoutLedger.target}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});