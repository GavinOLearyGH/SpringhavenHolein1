CREATE TABLE scores (
    day TEXT NOT NULL,
    player TEXT NOT NULL,
    name TEXT NOT NULL,
    ace INTEGER NOT NULL CHECK (ace IN (0, 1)),
    mm INTEGER NOT NULL CHECK (mm >= 0),
    posted INTEGER NOT NULL,
    PRIMARY KEY (day, player)
);
CREATE INDEX scores_day_rank ON scores(day, ace DESC, mm, posted, player);
