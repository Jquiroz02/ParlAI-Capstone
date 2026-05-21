# 491-ParlAI

ParlAI is a full-stack sports betting web-app that uses vitual currency and is hosted through Microsoft Azure.

## Frontend

React  
 React-router  
 Vite

## Backend

Microsoft Azure  
 Azure Static Web Apps  
 Microsoft Entra ID  
 GitHub Actions  
 Azure Functions
Node.js

## Prerequisites to run on your environment

Node.js  
 npm  
 Git  
 An Azure account  
 Playwright

## To build and test the app

Clone the repository:  
 `git clone https://github.com/AmalSresh/491-ParlAI.git`

## 🧪 End-to-End Testing (Playwright)

This project uses [Playwright](https://playwright.dev/) for End-to-End (E2E) testing to ensure the frontend, backend, and authentication flows work seamlessly together.

### First-Time Setup

After cloning the repo and running `npm install`, you **must** install the Playwright browsers:
`npm install
npx playwright install --with-deps`

### Running the Tests

We use `concurrently` and `wait-on` to automatically spin up the Azure Functions backend, the Vite frontend, and the SWA proxy all at once before running the tests.

**Run the full suite (Recommended)**
This command boots up the entire stack, waits for the ports to be ready, runs the tests in headless mode, and kills the servers when finished:
`npm run test:e2e:full`

**Run tests with the UI (For Debugging)**
If you already have your dev servers running (`npm run start:backend`, etc.) and want to visually step through the tests:
`npm run test:e2e:ui`

**Run in headless mode (Standalone)**
If your local environment is already running and you just want to execute the tests in the background:
`bash
npm run test:e2e
`

From project root:

Install dependencies:  
 `npm install`

Start up frontend and backend for local testing:  
 `npm run start`

Run Unit and Integration Tests:  
 `npm run test:frontend`

Run End-2-End Test:  
 `npm run test:e2e:full`

## For setting up and running each frontend/backend function individually perform these commands

navigate to the frontend directory  
 `cd frontend`

Install dependencies  
 `npm install`  
 Start the frontend emulator  
 `npm run dev`

navigate to the backend directory  
 `cd backend`

In the terminal run  
 `npm run start`

If you want to simulate authentication, also run this in the root directory
`swa start`
and use the link to the emulator

This will start the Azure emulator to simulate authentication, database functions, and present the frontend.

## Create .env file in Project root

FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
FACEBOOK_APP_SECRET_APP_SETTING_NAME=YOUR_FACEBOOK_APP_SECRET_APP_SETTING_NAME
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET_APP_SETTING_NAME=YOUR_GOOGLE_CLIENT_SECRET_APP_SETTING_NAME
TWITTER_CONSUMER_KEY=YOUR_TWITTER_CONSUMER_KEY
TWITTER_CONSUMER_SECRET=YOUR_TWITTER_CONSUMER_SECRET
DATABASE_URL=YOUR_DATABASE_URL
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_SERVER=YOUR_DB_SERVER
DB_NAME=YOUR_DB_NAME
SOCCER_ODDS_API=YOUR_ODDS_API_KEY

## In your backend directory put this in local.settings.json file:

{
"IsEncrypted": false,
"Values": {
"FUNCTIONS_WORKER_RUNTIME": "node",
"DB_SERVER": "YOUR_DB_SERVER",
"DB_USER": "YOUR_DB_USER",
"DB_PASSWORD": "YOUR_DB_PASS",
"DB_NAME": "YOUR_DB_NAME",
"AzureWebJobsStorage": "UseDevelopmentStorage=true",
"SOCCER_ODDS_API": "YOUR_ODDS_API_KEY"
}
}

## SQL server connection

Go to your SQL server > Security > Networking:  
 Under firewall rules, select "Add your client IPv4 address" and allow Azure services and resources to access this server
