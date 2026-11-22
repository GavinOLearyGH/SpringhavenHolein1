CREATE TABLE IF NOT EXISTS scores (
    day CHAR(10) NOT NULL,
    player CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    name VARCHAR(28) NOT NULL,
    ace TINYINT UNSIGNED NOT NULL,
    mm INT UNSIGNED NOT NULL,
    posted BIGINT UNSIGNED NOT NULL,
    score_rank INT UNSIGNED NOT NULL,
    PRIMARY KEY (day, player),
    KEY scores_day_rank (day, ace, mm, posted, player)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_attempts (
    day CHAR(10) NOT NULL,
    player CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    outcome ENUM('in-play', 'water', 'out') NOT NULL,
    ace TINYINT UNSIGNED NOT NULL,
    mm INT UNSIGNED,
    PRIMARY KEY (day, player)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS three_attempts (
    day CHAR(10) NOT NULL,
    player CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    revision INT UNSIGNED NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL,
    document LONGTEXT NOT NULL,
    total INT UNSIGNED,
    tie_valid TINYINT UNSIGNED NOT NULL DEFAULT 0,
    tie_mm INT UNSIGNED,
    name VARCHAR(28),
    posted BIGINT UNSIGNED,
    PRIMARY KEY (day,player),
    KEY three_rank (day,status,total,tie_valid,tie_mm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
