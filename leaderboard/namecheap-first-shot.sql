CREATE TABLE IF NOT EXISTS daily_attempts (
    day CHAR(10) NOT NULL,
    player CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    outcome ENUM('in-play', 'water', 'out') NOT NULL,
    ace TINYINT UNSIGNED NOT NULL,
    mm INT UNSIGNED,
    PRIMARY KEY (day, player)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
