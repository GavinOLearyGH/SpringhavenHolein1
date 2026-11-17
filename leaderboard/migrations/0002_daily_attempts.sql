CREATE TABLE daily_attempts (
    day TEXT NOT NULL,
    player TEXT NOT NULL,
    id TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('in-play', 'water', 'out')),
    ace INTEGER NOT NULL CHECK (ace IN (0, 1)),
    mm INTEGER,
    PRIMARY KEY (day, player)
);
