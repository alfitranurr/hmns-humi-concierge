-- Seed for products: the 28 perfume SKUs from the "Parfum (HMNS)" tab of the catalog sheet.
-- Prices come from the public HMNS catalog; stock values are demo data, not real inventory.
-- Knowledge Feeder keeps this table in sync with the sheet; web_stock is "N pcs" or "Sold out".
INSERT INTO products (sku, name, price, web_stock) VALUES
    ('HMNS-PRF-001', 'Alpha', 320000, '64 pcs'),
    ('HMNS-PRF-002', 'Farhampton', 369000, '37 pcs'),
    ('HMNS-PRF-003', 'Addict', 369000, '52 pcs'),
    ('HMNS-PRF-004', 'Ambar Janma', 510000, '14 pcs'),
    ('HMNS-PRF-005', 'ORGSM', 323000, '7 pcs'),
    ('HMNS-PRF-006', 'Darker Shade of ORGSM', 380000, '41 pcs'),
    ('HMNS-PRF-007', 'Melting Temptation ORGSM', 380000, '23 pcs'),
    ('HMNS-PRF-008', 'Essence of the Sun', 369000, '58 pcs'),
    ('HMNS-PRF-009', 'Unrosed', 374000, '19 pcs'),
    ('HMNS-PRF-010', 'Unpatched', 398000, '26 pcs'),
    ('HMNS-PRF-011', 'City of Hope (Jakarta Exclusive)', 490000, 'Sold out'),
    ('HMNS-PRF-012', 'Scent of Gods (Bali Exclusive)', 490000, 'Sold out'),
    ('HMNS-PRF-013', 'The Perfection', 398000, '33 pcs'),
    ('HMNS-PRF-014', 'The Prestige', 398000, '29 pcs'),
    ('HMNS-PRF-015', 'Untitled Humans Aroma 01', 395000, '12 pcs'),
    ('HMNS-PRF-016', 'Untitled Humans Aroma 02', 385000, '9 pcs'),
    ('HMNS-PRF-017', 'Elea', 185000, '46 pcs'),
    ('HMNS-PRF-018', 'Philea', 385000, '21 pcs'),
    ('HMNS-PRF-019', 'SORE Zena', 185000, '38 pcs'),
    ('HMNS-PRF-020', 'SORE Eterna', 385000, '17 pcs'),
    ('HMNS-PRF-021', 'My 1st O', 139000, '112 pcs'),
    ('HMNS-PRF-022', 'Drops of Sunshine', 145000, '87 pcs'),
    ('HMNS-PRF-023', 'Another Rose', 195000, '44 pcs'),
    ('HMNS-PRF-024', 'Darker Shade of O', 195000, '31 pcs'),
    ('HMNS-PRF-025', 'Alpha Hyper Green', 525000, '6 pcs'),
    ('HMNS-PRF-026', 'O Hyper Bloom', 525000, 'Sold out'),
    ('HMNS-PRF-027', 'EoS Hyper Nova', 525000, '11 pcs'),
    ('HMNS-PRF-028', 'Cherlavie', 185000, '73 pcs')
ON CONFLICT (sku) DO NOTHING;
