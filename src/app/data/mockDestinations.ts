export interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  tags: string[];
  budget: 'low' | 'medium' | 'high';
  climate: string;
  type: string;
  imageUrl: string;
  vectorStatus: 'indexed' | 'pending' | 'failed';
  ingested: boolean;
}

export const mockDestinations: Destination[] = [
  {
    id: '1',
    name: 'Tokyo',
    country: 'Japan',
    description: 'A vibrant metropolis blending ancient tradition with cutting-edge modernity. Experience serene temples, bustling streets, and world-class cuisine.',
    tags: ['culture', 'food', 'urban', 'technology', 'history'],
    budget: 'high',
    climate: 'temperate',
    type: 'city',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    vectorStatus: 'indexed',
    ingested: true
  },
  {
    id: '2',
    name: 'Santorini',
    country: 'Greece',
    description: 'Iconic white-washed buildings perched on volcanic cliffs overlooking the Aegean Sea. Famous for stunning sunsets and romantic atmosphere.',
    tags: ['beach', 'romance', 'scenic', 'relaxation', 'photography'],
    budget: 'high',
    climate: 'mediterranean',
    type: 'island',
    imageUrl: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800',
    vectorStatus: 'indexed',
    ingested: true
  },
  {
    id: '3',
    name: 'Bali',
    country: 'Indonesia',
    description: 'Tropical paradise with lush rice terraces, ancient temples, and pristine beaches. A haven for surfers, yogis, and culture seekers.',
    tags: ['beach', 'culture', 'nature', 'wellness', 'adventure'],
    budget: 'medium',
    climate: 'tropical',
    type: 'island',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
    vectorStatus: 'indexed',
    ingested: true
  },
  {
    id: '4',
    name: 'Machu Picchu',
    country: 'Peru',
    description: 'Ancient Incan citadel set high in the Andes Mountains. One of the most spectacular archaeological sites in the world.',
    tags: ['history', 'adventure', 'hiking', 'culture', 'mountains'],
    budget: 'medium',
    climate: 'mountain',
    type: 'historical',
    imageUrl: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800',
    vectorStatus: 'indexed',
    ingested: true
  },
  {
    id: '5',
    name: 'Paris',
    country: 'France',
    description: 'The City of Light offers world-class art, iconic landmarks, and unparalleled culinary experiences. Romance and culture at every corner.',
    tags: ['culture', 'art', 'food', 'romance', 'history'],
    budget: 'high',
    climate: 'temperate',
    type: 'city',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
    vectorStatus: 'indexed',
    ingested: true
  },
  {
    id: '6',
    name: 'Iceland',
    country: 'Iceland',
    description: 'Land of fire and ice with dramatic landscapes including glaciers, volcanoes, hot springs, and the Northern Lights.',
    tags: ['nature', 'adventure', 'photography', 'northern lights', 'unique'],
    budget: 'high',
    climate: 'arctic',
    type: 'nature',
    imageUrl: 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800',
    vectorStatus: 'indexed',
    ingested: true
  },
  {
    id: '7',
    name: 'Marrakech',
    country: 'Morocco',
    description: 'Exotic blend of ancient souks, stunning palaces, and vibrant culture. A sensory feast of colors, sounds, and spices.',
    tags: ['culture', 'markets', 'food', 'history', 'exotic'],
    budget: 'low',
    climate: 'desert',
    type: 'city',
    imageUrl: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800',
    vectorStatus: 'indexed',
    ingested: true
  },
  {
    id: '8',
    name: 'New Zealand',
    country: 'New Zealand',
    description: 'Breathtaking natural beauty from snow-capped mountains to pristine beaches. Adventure capital with endless outdoor activities.',
    tags: ['nature', 'adventure', 'hiking', 'scenic', 'outdoor'],
    budget: 'high',
    climate: 'temperate',
    type: 'nature',
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    vectorStatus: 'indexed',
    ingested: true
  },
  {
    id: '9',
    name: 'Bangkok',
    country: 'Thailand',
    description: 'Bustling metropolis with ornate temples, vibrant street life, and incredible street food. Modern meets traditional.',
    tags: ['culture', 'food', 'urban', 'markets', 'nightlife'],
    budget: 'low',
    climate: 'tropical',
    type: 'city',
    imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800',
    vectorStatus: 'indexed',
    ingested: true
  },
  {
    id: '10',
    name: 'Swiss Alps',
    country: 'Switzerland',
    description: 'Majestic mountain peaks, charming villages, and world-class ski resorts. Perfect for outdoor enthusiasts and nature lovers.',
    tags: ['mountains', 'skiing', 'hiking', 'scenic', 'luxury'],
    budget: 'high',
    climate: 'mountain',
    type: 'nature',
    imageUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800',
    vectorStatus: 'pending',
    ingested: false
  }
];
