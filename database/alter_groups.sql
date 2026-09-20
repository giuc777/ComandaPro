USE comandapro;
ALTER TABLE catalog_groups ADD COLUMN icon VARCHAR(50) AFTER description;
ALTER TABLE catalog_groups ADD COLUMN color VARCHAR(7) AFTER icon;
