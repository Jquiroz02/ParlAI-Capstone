-- 1. USERS
CREATE TABLE users (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    azure_user_id NVARCHAR(255) NOT NULL UNIQUE, -- EntraID related. Accounts made using Google/Facebook/Twitter can use this token to retrieve the rest of their details
    email NVARCHAR(255) NOT NULL,
    name NVARCHAR(255),
    nickname NVARCHAR(50) UNIQUE, 
    onboarding_stage INT NOT NULL DEFAULT 0, -- Can add more customization and layers, currently 0 or 1 just to create a nickname and select favorite team
    balance DECIMAL(18,2) NOT NULL DEFAULT 1000.00,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- 2. LEAGUES
CREATE TABLE leagues (
    id INT IDENTITY(1,1) PRIMARY KEY, 
    name NVARCHAR(255) NOT NULL,
    country NVARCHAR(100)
);

-- 3. TEAMS
CREATE TABLE teams (
    id INT IDENTITY(1,1) PRIMARY KEY,
    league_id INT NOT NULL,
    name NVARCHAR(255) NOT NULL,

    CONSTRAINT FK_team_league FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE
);

-- 4. EVENTS
CREATE TABLE events (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    league_id INT NOT NULL,
    home_team_id INT NOT NULL,
    away_team_id INT NOT NULL,
    start_time DATETIME2 NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', 
    home_score INT NULL,
    away_score INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_event_league FOREIGN KEY (league_id) REFERENCES leagues(id),
    CONSTRAINT FK_event_home_team FOREIGN KEY (home_team_id) REFERENCES teams(id),
    CONSTRAINT FK_event_away_team FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

-- 5. MARKETS
CREATE TABLE markets (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    event_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open', 
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_market_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- 6. SELECTIONS
CREATE TABLE selections (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    market_id BIGINT NOT NULL,
    label NVARCHAR(255) NOT NULL,
    odds DECIMAL(10,4) NOT NULL,
    line_value DECIMAL(10,2) NULL, 
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_selection_market FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE
);

-- 7. WALLET LEDGER
CREATE TABLE wallet_ledger (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    bet_id BIGINT NULL, 
    amount DECIMAL(18,2) NOT NULL,
    type VARCHAR(50) NOT NULL, 
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. BETS
CREATE TABLE bets (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    selection_id BIGINT NOT NULL,
    stake DECIMAL(18,2) NOT NULL,
    odds_at_placement DECIMAL(10,4) NOT NULL,
    potential_payout DECIMAL(18,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    placed_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    settled_at DATETIME2 NULL,

    CONSTRAINT FK_bet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_bet_selection FOREIGN KEY (selection_id) REFERENCES selections(id)
);

-- Add the missing FK for wallet_ledger referencing bets
ALTER TABLE wallet_ledger
ADD CONSTRAINT FK_wallet_bet FOREIGN KEY (bet_id) REFERENCES bets(id);

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Indexing Foreign Keys (SQL Server does not index FKs automatically)
CREATE NONCLUSTERED INDEX IX_teams_league_id ON teams(league_id);
CREATE NONCLUSTERED INDEX IX_events_league_id ON events(league_id);
CREATE NONCLUSTERED INDEX IX_events_home_team_id ON events(home_team_id);
CREATE NONCLUSTERED INDEX IX_events_away_team_id ON events(away_team_id);
CREATE NONCLUSTERED INDEX IX_markets_event_id ON markets(event_id);
CREATE NONCLUSTERED INDEX IX_selections_market_id ON selections(market_id);
CREATE NONCLUSTERED INDEX IX_wallet_ledger_user_id ON wallet_ledger(user_id);
CREATE NONCLUSTERED INDEX IX_wallet_ledger_bet_id ON wallet_ledger(bet_id);
CREATE NONCLUSTERED INDEX IX_bets_user_id ON bets(user_id);
CREATE NONCLUSTERED INDEX IX_bets_selection_id ON bets(selection_id);

-- Indexing frequently filtered columns (Statuses)
CREATE NONCLUSTERED INDEX IX_events_status ON events(status);
CREATE NONCLUSTERED INDEX IX_bets_status ON bets(status);

-- NFL Players table
-- Stores player info fetched from Sleeper API
CREATE TABLE nfl_players (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    sleeper_id  NVARCHAR(50)  NOT NULL UNIQUE,
    name        NVARCHAR(255) NOT NULL,
    position    NVARCHAR(10)  NOT NULL,
    team        NVARCHAR(10)  NOT NULL,
    created_at  DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
