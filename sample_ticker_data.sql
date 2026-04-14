-- Sample data for ticker_messages table
-- Run this AFTER running supabase_live_data_schema.sql

INSERT INTO ticker_messages (message_text, message_type, color_class, priority, is_active, is_auto_generated, source_type) VALUES
('$NPGX Token Live on Exchange 🔥', 'alert', 'text-punk-electric', 5, true, false, 'manual'),
('Raven Shadow climbs 7 ranks to #3 📈', 'news', 'text-punk-electric', 4, true, true, 'rank_change'),
('$RAVEN: $0.0156 (+23.4%) 🚀', 'price', 'text-punk-electric', 4, true, true, 'price_change'),
('Shadow Market Volume: 2.4M NPGX 💀', 'update', 'text-gray-300', 2, true, false, 'manual'),
('BREAKING: New Elite Faction Emerges 🥷', 'alert', 'text-punk-blood', 5, true, false, 'manual'),
('Cyber Vixen drops 12 ranks to #15 📉', 'news', 'text-punk-blood', 3, true, true, 'rank_change'),
('Character Mint Rate: +420% This Week 🚀', 'news', 'text-punk-cyber', 3, true, false, 'manual'),
('Underground Marketplace: 3,247 Active Users 👥', 'update', 'text-gray-300', 2, true, false, 'manual'),
('WARNING: Rival Ninja Clan Detected 🚨', 'alert', 'text-punk-toxic', 4, true, false, 'manual'),
('$CYBER: $0.0089 (-8.2%) 💥', 'price', 'text-punk-blood', 3, true, true, 'price_change'),
('Stealth Mode: New Features Incoming 🌙', 'news', 'text-punk-cyber', 3, true, false, 'manual'),
('$NPGX Market Cap: $1.2M 💎', 'price', 'text-punk-electric', 3, true, false, 'manual'),
('Ninja Recruitment: 156 New Members Today ⚔️', 'alert', 'text-punk-electric', 4, true, false, 'manual'),
('Daily Character Generations: 234 🎭', 'update', 'text-gray-300', 2, true, false, 'manual'),
('Dark Phoenix surges to #1 🔥', 'news', 'text-punk-electric', 5, true, true, 'rank_change'),
('Total Platform Revenue: $45K Today 💰', 'update', 'text-punk-cyber', 3, true, false, 'manual');

-- Sample ninja rankings data
INSERT INTO ninja_rankings (name, ticker, slug, category, verified, current_rank, previous_rank, rank_change, market_cap, volume_24h, price, price_change_24h, total_views, total_revenue, unique_fans, holders) VALUES
('Dark Phoenix', '$PHOENIX', 'dark-phoenix', 'Elite Assassin', true, 1, 3, 2, 2500000, 450000, 0.0234, 15.7, 15000000, 125000, 850000, 25000),
('Raven Shadow', '$RAVEN', 'raven-shadow', 'Shadow Ops', true, 2, 1, -1, 2200000, 380000, 0.0198, -3.2, 12500000, 110000, 720000, 22000),
('Cyber Vixen', '$CYBER', 'cyber-vixen', 'Cyber Warrior', true, 3, 2, -1, 1800000, 320000, 0.0156, 8.9, 11000000, 95000, 650000, 18000),
('Neon Storm', '$NEON', 'neon-storm', 'Street Fighter', true, 4, 6, 2, 1600000, 280000, 0.0142, 12.3, 9500000, 85000, 580000, 16000),
('Steel Rose', '$STEEL', 'steel-rose', 'Underground', true, 5, 4, -1, 1400000, 250000, 0.0128, -2.1, 8800000, 78000, 520000, 14000),
('Crimson Blade', '$CRIMSON', 'crimson-blade', 'Rebel Queen', true, 6, 5, -1, 1200000, 220000, 0.0115, 5.6, 8200000, 72000, 480000, 12000),
('Jade Assassin', '$JADE', 'jade-assassin', 'Ninja Master', true, 7, 8, 1, 1000000, 180000, 0.0098, 18.4, 7500000, 65000, 420000, 10000),
('Violet Rebel', '$VIOLET', 'violet-rebel', 'Punk Goddess', true, 8, 7, -1, 950000, 160000, 0.0089, -5.7, 7000000, 58000, 380000, 9500),
('Echo Strike', '$ECHO', 'echo-strike', 'Elite Assassin', true, 9, 12, 3, 880000, 140000, 0.0076, 22.1, 6500000, 52000, 340000, 8800),
('Nova Punk', '$NOVA', 'nova-punk', 'Cyber Warrior', true, 10, 9, -1, 820000, 125000, 0.0068, -1.8, 6000000, 48000, 310000, 8200);

-- Sample market data
INSERT INTO market_data (symbol, price, price_change_24h, volume_24h, market_cap, circulating_supply, total_supply, total_users, active_users_24h, total_characters_created, characters_created_24h, total_revenue_24h) VALUES
('NPGX', 0.004237, 15.7, 1200000, 8470000, 2000000000, 10000000000, 12847, 3247, 1256, 234, 45000); 