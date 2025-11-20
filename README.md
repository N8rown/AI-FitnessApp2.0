# AI Fitness App

A full-stack AI fitness application with blockchain integration.

## Prerequisites

- Node.js (v16+)
- MetaMask Browser Extension

## Setup & Installation

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Start the Blockchain (Localhost)**
    Open a new terminal and run:
    ```bash
    npm run node --workspace=blockchain
    ```
    This starts a local Hardhat node. Keep this terminal open.

3.  **Deploy the Contract**
    Open a second terminal and run:
    ```bash
    npm run deploy --workspace=blockchain
    ```
    Note the deployed contract address. If it is different from `0x5FbDB2315678afecb367f032d93F642f64180aa3`, update it in `client/src/utils/blockchain.js`.

4.  **Start the Backend**
    In the same terminal (or a new one):
    ```bash
    npm run start:server
    ```
    The server runs on `http://localhost:3000`.

5.  **Start the Frontend**
    Open a third terminal:
    ```bash
    npm run start:client
    ```
    The app runs on `http://localhost:5173`.

## Usage Guide

1.  **Register/Login**: Create an account.
2.  **Onboarding**: Enter your height, weight, and goals (e.g., "Build muscle").
3.  **Dashboard**:
    -   Click **Generate New Workout** to get an AI-generated plan (mocked for demo).
    -   Click **Log to Blockchain** on a workout card to save it to the local blockchain.
    -   **MetaMask**: You will need to connect MetaMask to `Localhost 8545` and import one of the private keys provided by the `npm run node` command to pay for gas.

## Tech Stack

-   **Frontend**: React, Vite, Tailwind CSS
-   **Backend**: Node.js, Express, SQLite
-   **Blockchain**: Hardhat, Solidity, Ethers.js
