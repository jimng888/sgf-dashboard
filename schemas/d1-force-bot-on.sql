-- Force kill switch to ON so the bot is allowed to run (run once if bot was off)
INSERT OR IGNORE INTO settings (key, value) VALUES ('bot_enabled', '1');
UPDATE settings SET value = '1' WHERE key = 'bot_enabled';
