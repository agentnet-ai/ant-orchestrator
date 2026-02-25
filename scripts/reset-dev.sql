-- reset-dev.sql — Truncate all data, preserve schema.
-- FK-safe ordering: children first, then parents.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE Messages;
TRUNCATE TABLE Conversations;

SET FOREIGN_KEY_CHECKS = 1;
