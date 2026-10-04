-- F08: surface resistances for the new floor categories (v7.20 `U-values!T131:T132`).
-- floor_ground: the zone method ignores Rsi/Rse; the row exists only so the category is never missing (0.17/0.04 = legacy floor).
INSERT OR IGNORE INTO `surface_resistance` (`id`, `element_category`, `interior_resistance_m2k_per_w`, `exterior_resistance_m2k_per_w`) VALUES
('ba621731-20e8-4337-afc3-01a353fddf78', 'floor_over_unheated', 0.115, 0.167),
('19ecc7b0-f0fc-4c96-8759-e67c8977eb32', 'floor_ground', 0.17, 0.04);
