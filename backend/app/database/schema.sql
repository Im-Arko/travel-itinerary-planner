-- ============================================================
-- Travel Itinerary App - MariaDB Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS travel_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE travel_app;

-- ────────────────────────────────────────────────────────────
-- Users Table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100),
    avatar_url    VARCHAR(500),
    created_at    DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active     BOOLEAN     DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_username (username)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
-- User Preferences Table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id          INT UNSIGNED NOT NULL,
    budget           ENUM('budget','moderate','luxury') NOT NULL DEFAULT 'moderate',
    preferred_climate ENUM('tropical','temperate','arid','cold','mediterranean','any') NOT NULL DEFAULT 'any',
    destination_type ENUM('beach','mountain','city','countryside','adventure','cultural','any') NOT NULL DEFAULT 'any',
    trip_duration    TINYINT UNSIGNED NOT NULL DEFAULT 7 COMMENT 'Number of days',
    travel_style     SET('solo','couple','family','group') DEFAULT 'solo',
    interests        TEXT COMMENT 'JSON array of interest tags',
    dietary_needs    VARCHAR(255),
    accessibility    BOOLEAN DEFAULT FALSE,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pref_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_pref_user (user_id)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
-- Destinations Knowledge Base
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS destinations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150)  NOT NULL,
    country         VARCHAR(100)  NOT NULL,
    continent       VARCHAR(50),
    description     TEXT          NOT NULL,
    climate_type    ENUM('tropical','temperate','arid','cold','mediterranean') NOT NULL,
    destination_type ENUM('beach','mountain','city','countryside','adventure','cultural') NOT NULL,
    budget_level    ENUM('budget','moderate','luxury') NOT NULL,
    best_months     VARCHAR(100)  COMMENT 'e.g. "April,May,October,November"',
    avg_temp_c      DECIMAL(4,1),
    tags            TEXT          COMMENT 'JSON array of tags',
    image_url       VARCHAR(500),
    latitude        DECIMAL(9,6),
    longitude       DECIMAL(9,6),
    chroma_doc_id   VARCHAR(100)  COMMENT 'Reference ID in ChromaDB vector store',
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_climate (climate_type),
    INDEX idx_type (destination_type),
    INDEX idx_budget (budget_level)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
-- Itineraries Table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itineraries (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    destination_id  INT UNSIGNED,
    title           VARCHAR(255) NOT NULL,
    destination_name VARCHAR(150) NOT NULL,
    duration_days   TINYINT UNSIGNED NOT NULL,
    budget          ENUM('budget','moderate','luxury') NOT NULL,
    travel_style    VARCHAR(50),
    summary         TEXT,
    full_itinerary  LONGTEXT     NOT NULL COMMENT 'JSON with day-wise plan',
    status          ENUM('draft','saved','archived') DEFAULT 'saved',
    is_favorite     BOOLEAN      DEFAULT FALSE,
    rating          TINYINT      CHECK (rating BETWEEN 1 AND 5),
    user_notes      TEXT,
    generated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_itin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_itin_dest FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL,
    INDEX idx_itin_user (user_id),
    INDEX idx_itin_status (status),
    INDEX idx_itin_favorite (user_id, is_favorite)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
-- Itinerary Days Table (normalised day-wise breakdown)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itinerary_days (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    itinerary_id  INT UNSIGNED NOT NULL,
    day_number    TINYINT UNSIGNED NOT NULL,
    theme         VARCHAR(255),
    morning       TEXT,
    afternoon     TEXT,
    evening       TEXT,
    accommodation VARCHAR(255),
    estimated_cost DECIMAL(10,2),
    tips          TEXT,
    CONSTRAINT fk_day_itin FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
    INDEX idx_day_itin (itinerary_id),
    UNIQUE KEY uq_itin_day (itinerary_id, day_number)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
-- Refresh Tokens (JWT token management)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  DATETIME NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked     BOOLEAN  DEFAULT FALSE,
    CONSTRAINT fk_tok_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tok_user (user_id),
    INDEX idx_tok_hash (token_hash)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
-- Seed: Destination Knowledge Base
-- ────────────────────────────────────────────────────────────
INSERT INTO destinations (name, country, continent, description, climate_type, destination_type, budget_level, best_months, avg_temp_c, tags, image_url, latitude, longitude) VALUES

('Bali', 'Indonesia', 'Asia',
 'Bali is a tropical paradise blending lush rice terraces, ancient Hindu temples, volcanic mountains, and pristine beaches. The island is famous for its spiritual culture, world-class surf, vibrant nightlife in Seminyak, and wellness retreats in Ubud. Street food is incredible and affordable. Perfect for solo travellers, couples and adventure seekers alike.',
 'tropical', 'beach', 'budget', 'April,May,June,July,August,September', 28.0,
 '["surfing","temples","rice terraces","yoga","diving","nightlife","wellness","budget-friendly"]',
 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800', -8.409518, 115.188919),

('Santorini', 'Greece', 'Europe',
 'Santorini is the crown jewel of the Aegean Sea — a crescent-shaped volcanic island with iconic white-washed buildings and blue-domed churches perched on dramatic cliffs. Famous for spectacular sunsets over the caldera, fine wines from volcanic-soil vineyards, and crystal-clear waters. A luxury honeymoon and couples destination par excellence.',
 'mediterranean', 'beach', 'luxury', 'June,July,August,September', 25.5,
 '["sunsets","luxury","romance","wine","sailing","cliffs","photography","honeymoon"]',
 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800', 36.393155, 25.461509),

('Patagonia', 'Argentina', 'South America',
 'Patagonia spans the southern ends of Chile and Argentina, offering some of the world''s most dramatic landscapes: jagged granite towers of Torres del Paine, massive Perito Moreno Glacier, sweeping Andean steppes and pristine fjords. A bucket-list destination for trekkers, climbers and wildlife lovers. Penguins, condors and pumas roam freely.',
 'cold', 'adventure', 'moderate', 'November,December,January,February,March', 8.0,
 '["trekking","glacier","wildlife","photography","camping","adventure","remote","nature"]',
 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800', -51.623157, -72.705727),

('Kyoto', 'Japan', 'Asia',
 'Kyoto was Japan''s imperial capital for over a millennium and preserves an extraordinary concentration of temples, shrines, geisha districts and traditional wooden machiya townhouses. Cherry blossom season transforms the city into a dreamscape. The cuisine—kaiseki multi-course dining, matcha sweets, and ramen—is world-class. An unmissable cultural immersion.',
 'temperate', 'cultural', 'moderate', 'March,April,May,October,November', 15.0,
 '["temples","cherry blossoms","geisha","cuisine","history","gardens","tea ceremony","anime"]',
 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800', 35.011636, 135.768029),

('Marrakech', 'Morocco', 'Africa',
 'Marrakech is a city of sensory overload in the best possible way. The medieval Medina is a UNESCO World Heritage labyrinth of souks, riads, and spice markets centred around the legendary Djemaa el-Fna square. Colourful tiled palaces, hammams, and camel treks to the Sahara dunes make it a mesmerising budget-friendly cultural adventure.',
 'arid', 'cultural', 'budget', 'March,April,October,November', 22.0,
 '["souks","medina","sahara","food","architecture","photography","hammam","budget-friendly"]',
 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800', 31.629472, -7.981084),

('Banff', 'Canada', 'North America',
 'Banff National Park in the Canadian Rockies is a jaw-dropping wilderness of turquoise glacial lakes (Moraine Lake, Lake Louise), soaring peaks, and diverse wildlife. World-class skiing in winter, sensational hiking in summer. The charming town of Banff offers boutique lodges, spas and farm-to-table restaurants. Ideal for nature lovers and outdoor enthusiasts.',
 'cold', 'mountain', 'luxury', 'June,July,August,December,January,February', 5.0,
 '["skiing","hiking","lakes","wildlife","mountains","photography","camping","luxury lodges"]',
 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', 51.496323, -115.928161),

('Amalfi Coast', 'Italy', 'Europe',
 'The Amalfi Coast is a UNESCO-listed stretch of dramatic Mediterranean coastline in southern Italy, where pastel-coloured fishing villages cling to sheer cliffs above impossibly blue water. Positano, Ravello and Amalfi itself are postcard-perfect. Limoncello, fresh seafood, and hand-made pasta are the gastronomic highlights. Best explored by boat or vespa.',
 'mediterranean', 'beach', 'luxury', 'May,June,September,October', 23.0,
 '["coastal","villages","seafood","boat tours","luxury","romance","photography","Italy"]',
 'https://images.unsplash.com/photo-1534445867742-43195f401b6c?w=800', 40.633333, 14.600000),

('Chiang Mai', 'Thailand', 'Asia',
 'Chiang Mai is Thailand''s cultural capital—a walled old city surrounded by a moat and dotted with over 300 ancient temples. The surrounding mountains host hill-tribe villages, elephant sanctuaries, and spectacular trekking. Famous for its Sunday Walking Street, lantern festival, and exceptional street food. An incredibly affordable base for exploring Northern Thailand.',
 'tropical', 'cultural', 'budget', 'November,December,January,February,March', 26.0,
 '["temples","elephants","trekking","street food","markets","budget-friendly","culture","wellness"]',
 'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=800', 18.796143, 98.978760),

('Queenstown', 'New Zealand', 'Oceania',
 'Queenstown is the adventure capital of the world, set on the shores of Lake Wakatipu and ringed by the Remarkables mountain range. Bungee jumping was invented here, and the options for adrenaline activities are endless—skydiving, jet boating, white-water rafting, paragliding. In winter, world-class ski resorts are minutes away. The scenery is Lord of the Rings-level epic.',
 'temperate', 'adventure', 'moderate', 'June,July,August,December,January,February', 12.0,
 '["bungee jumping","skiing","adventure","wine","fjords","hiking","skydiving","LOTR"]',
 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800', -45.031162, 168.662643),

('Tuscany', 'Italy', 'Europe',
 'Tuscany is the heartland of Renaissance art and the Italian countryside dream. Rolling hills dotted with cypress trees, medieval hilltop towns like Siena and San Gimignano, world-class wineries in Chianti, and Florence''s unparalleled art museums. Cooking classes, truffle hunts, and vineyard cycling complete the picture. A perfect slow-travel destination.',
 'mediterranean', 'countryside', 'moderate', 'April,May,June,September,October', 18.0,
 '["wine","art","cooking","cycling","hilltop towns","renaissance","photography","slow travel"]',
 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=800', 43.771531, 11.254910);
