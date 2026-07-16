-- Add address column to persons table
ALTER TABLE persons ADD COLUMN address VARCHAR(255) NULL;

-- Add address column to producers table
ALTER TABLE producers ADD COLUMN address VARCHAR(255) NULL;