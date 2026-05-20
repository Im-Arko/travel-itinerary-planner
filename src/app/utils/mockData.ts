// Mock vector similarity search and LLM generation
export function generateItinerary(preferences: any) {
  const { destination, duration, budget, travelers, interests } = preferences;

  // Simulate vector similarity matching (0-100 score)
  const similarityScore = calculateSimilarityScore(interests);

  // Mock LLM-generated itinerary based on preferences
  const itineraries: Record<string, any> = {
    japan: {
      destination: 'Japan Adventure',
      overview: 'Experience the perfect blend of ancient tradition and cutting-edge modernity in Japan. From serene temples to bustling streets, this itinerary captures the essence of Japanese culture.',
      highlights: [
        'Visit the iconic Fushimi Inari Shrine with thousands of torii gates',
        'Experience authentic tea ceremony in Kyoto',
        'Explore the vibrant streets of Shibuya and Harajuku',
        'Relax in traditional onsen hot springs',
        'Sample world-class sushi at Tsukiji Fish Market',
        'Marvel at Mount Fuji from Hakone'
      ],
      days: [
        {
          day: 1,
          title: 'Arrival in Tokyo',
          activities: [
            {
              time: '10:00 AM',
              activity: 'Check-in at Hotel',
              location: 'Shinjuku, Tokyo',
              description: 'Settle into your hotel in the heart of Tokyo. Rest and freshen up after your flight.',
              cost: '$150'
            },
            {
              time: '2:00 PM',
              activity: 'Explore Shibuya Crossing',
              location: 'Shibuya, Tokyo',
              description: 'Experience the world\'s busiest pedestrian crossing and explore the vibrant shopping district.',
              cost: '$30'
            },
            {
              time: '7:00 PM',
              activity: 'Dinner at Ichiran Ramen',
              location: 'Shibuya, Tokyo',
              description: 'Enjoy authentic Japanese ramen at this famous chain known for its individual dining booths.',
              cost: '$15'
            }
          ]
        },
        {
          day: 2,
          title: 'Traditional Tokyo',
          activities: [
            {
              time: '9:00 AM',
              activity: 'Senso-ji Temple Visit',
              location: 'Asakusa, Tokyo',
              description: 'Explore Tokyo\'s oldest temple and browse the traditional Nakamise shopping street.',
              cost: 'Free'
            },
            {
              time: '12:00 PM',
              activity: 'Lunch at Tempura Restaurant',
              location: 'Asakusa, Tokyo',
              description: 'Savor perfectly crispy tempura at a local favorite restaurant.',
              cost: '$25'
            },
            {
              time: '3:00 PM',
              activity: 'TeamLab Borderless Digital Art Museum',
              location: 'Odaiba, Tokyo',
              description: 'Immerse yourself in stunning interactive digital art installations.',
              cost: '$35'
            },
            {
              time: '7:00 PM',
              activity: 'Dinner Cruise on Sumida River',
              location: 'Tokyo Bay',
              description: 'Enjoy a scenic dinner cruise with views of Tokyo\'s illuminated skyline.',
              cost: '$80'
            }
          ]
        },
        {
          day: 3,
          title: 'Day Trip to Nikko',
          activities: [
            {
              time: '8:00 AM',
              activity: 'Shinkansen to Nikko',
              location: 'Tokyo to Nikko',
              description: 'Take the bullet train to the historic mountain town of Nikko.',
              cost: '$60'
            },
            {
              time: '10:30 AM',
              activity: 'Toshogu Shrine Complex',
              location: 'Nikko',
              description: 'Visit this ornate UNESCO World Heritage shrine surrounded by ancient cedar forests.',
              cost: '$20'
            },
            {
              time: '1:00 PM',
              activity: 'Yuba Lunch',
              location: 'Nikko',
              description: 'Try Nikko\'s specialty yuba (tofu skin) at a traditional restaurant.',
              cost: '$30'
            },
            {
              time: '6:00 PM',
              activity: 'Return to Tokyo',
              location: 'Nikko to Tokyo',
              description: 'Head back to Tokyo for the evening.',
              cost: 'Included'
            }
          ]
        }
      ],
      totalCost: `$${Math.round(budget * 0.9).toLocaleString()}`,
      similarityScore
    },
    italy: {
      destination: 'Italian Romance',
      overview: 'Indulge in la dolce vita with this carefully crafted journey through Italy\'s most enchanting cities. From Renaissance art to culinary delights, experience the best of Italian culture.',
      highlights: [
        'Private tour of the Vatican Museums and Sistine Chapel',
        'Gondola ride through Venice\'s historic canals',
        'Wine tasting in Tuscany\'s rolling vineyards',
        'Cooking class with a local Italian chef',
        'Sunset view from Piazzale Michelangelo in Florence',
        'Explore the ancient ruins of the Roman Forum'
      ],
      days: [
        {
          day: 1,
          title: 'Arrival in Rome',
          activities: [
            {
              time: '11:00 AM',
              activity: 'Check-in and Welcome',
              location: 'Trastevere, Rome',
              description: 'Arrive at your charming boutique hotel in the historic Trastevere neighborhood.',
              cost: '$180'
            },
            {
              time: '2:00 PM',
              activity: 'Colosseum Tour',
              location: 'Colosseum, Rome',
              description: 'Skip-the-line access to explore this iconic ancient amphitheater.',
              cost: '$45'
            },
            {
              time: '7:00 PM',
              activity: 'Traditional Roman Dinner',
              location: 'Trastevere, Rome',
              description: 'Enjoy authentic cacio e pepe and carbonara at a family-run trattoria.',
              cost: '$40'
            }
          ]
        },
        {
          day: 2,
          title: 'Vatican & Renaissance Rome',
          activities: [
            {
              time: '8:30 AM',
              activity: 'Vatican Museums Early Access',
              location: 'Vatican City',
              description: 'Beat the crowds with priority access to see the Sistine Chapel and Raphael Rooms.',
              cost: '$70'
            },
            {
              time: '12:00 PM',
              activity: 'Lunch near Piazza Navona',
              location: 'Historic Center, Rome',
              description: 'Savor fresh pasta and local wine at a charming piazza restaurant.',
              cost: '$35'
            },
            {
              time: '3:00 PM',
              activity: 'Trevi Fountain & Spanish Steps',
              location: 'Historic Center, Rome',
              description: 'Toss a coin in the Trevi Fountain and stroll through Rome\'s shopping district.',
              cost: 'Free'
            },
            {
              time: '7:00 PM',
              activity: 'Gelato Making Class',
              location: 'Trastevere, Rome',
              description: 'Learn to make authentic Italian gelato with a master gelataio.',
              cost: '$55'
            }
          ]
        },
        {
          day: 3,
          title: 'Florence Bound',
          activities: [
            {
              time: '9:00 AM',
              activity: 'High-Speed Train to Florence',
              location: 'Rome to Florence',
              description: 'Enjoy scenic views on the comfortable Frecciarossa train.',
              cost: '$50'
            },
            {
              time: '11:30 AM',
              activity: 'Uffizi Gallery Visit',
              location: 'Florence',
              description: 'Marvel at masterpieces by Botticelli, Leonardo da Vinci, and Michelangelo.',
              cost: '$40'
            },
            {
              time: '2:00 PM',
              activity: 'Florentine Steak Lunch',
              location: 'Oltrarno, Florence',
              description: 'Indulge in bistecca alla fiorentina at a renowned local steakhouse.',
              cost: '$65'
            },
            {
              time: '5:00 PM',
              activity: 'Sunset at Piazzale Michelangelo',
              location: 'Florence Hills',
              description: 'Watch the sun set over Florence\'s iconic Duomo from this panoramic viewpoint.',
              cost: 'Free'
            }
          ]
        }
      ],
      totalCost: `$${Math.round(budget * 0.85).toLocaleString()}`,
      similarityScore
    },
    thailand: {
      destination: 'Thailand Paradise',
      overview: 'Discover the land of smiles with this tropical adventure combining bustling Bangkok, ancient temples, and pristine beaches. Perfect for culture enthusiasts and beach lovers alike.',
      highlights: [
        'Explore the Grand Palace and Temple of the Emerald Buddha',
        'Cruise through floating markets on a traditional longtail boat',
        'Learn to cook authentic Thai cuisine',
        'Relax on white sand beaches in Phuket',
        'Snorkel in crystal-clear waters around Phi Phi Islands',
        'Experience traditional Thai massage'
      ],
      days: [
        {
          day: 1,
          title: 'Bangkok Arrival',
          activities: [
            {
              time: '10:00 AM',
              activity: 'Hotel Check-in',
              location: 'Sukhumvit, Bangkok',
              description: 'Arrive at your modern hotel in Bangkok\'s vibrant Sukhumvit district.',
              cost: '$80'
            },
            {
              time: '2:00 PM',
              activity: 'Grand Palace Visit',
              location: 'Rattanakosin, Bangkok',
              description: 'Explore Thailand\'s most sacred Buddhist temple and the former royal residence.',
              cost: '$15'
            },
            {
              time: '7:00 PM',
              activity: 'Street Food Tour',
              location: 'Chinatown, Bangkok',
              description: 'Sample delicious Thai street food with a local guide through bustling Yaowarat.',
              cost: '$25'
            }
          ]
        },
        {
          day: 2,
          title: 'Markets & Temples',
          activities: [
            {
              time: '7:00 AM',
              activity: 'Floating Market Experience',
              location: 'Damnoen Saduak',
              description: 'Navigate traditional floating markets by longtail boat and shop from vendors on the water.',
              cost: '$40'
            },
            {
              time: '12:00 PM',
              activity: 'Thai Cooking Class',
              location: 'Bangkok',
              description: 'Learn to prepare classic dishes like pad thai and green curry.',
              cost: '$50'
            },
            {
              time: '4:00 PM',
              activity: 'Wat Pho & Reclining Buddha',
              location: 'Rattanakosin, Bangkok',
              description: 'Visit the Temple of the Reclining Buddha and enjoy a traditional Thai massage.',
              cost: '$20'
            },
            {
              time: '7:00 PM',
              activity: 'Rooftop Dinner',
              location: 'Riverside, Bangkok',
              description: 'Dine with spectacular views of Bangkok\'s illuminated skyline.',
              cost: '$60'
            }
          ]
        },
        {
          day: 3,
          title: 'Beach Paradise',
          activities: [
            {
              time: '9:00 AM',
              activity: 'Flight to Phuket',
              location: 'Bangkok to Phuket',
              description: 'Short domestic flight to Thailand\'s largest island.',
              cost: '$100'
            },
            {
              time: '12:00 PM',
              activity: 'Beach Resort Check-in',
              location: 'Patong Beach, Phuket',
              description: 'Settle into your beachfront resort with ocean views.',
              cost: '$120'
            },
            {
              time: '3:00 PM',
              activity: 'Beach Relaxation',
              location: 'Patong Beach',
              description: 'Unwind on pristine white sand beaches with turquoise waters.',
              cost: 'Free'
            },
            {
              time: '7:00 PM',
              activity: 'Seafood Dinner',
              location: 'Patong Beach',
              description: 'Fresh grilled seafood at a beachside restaurant.',
              cost: '$35'
            }
          ]
        }
      ],
      totalCost: `$${Math.round(budget * 0.75).toLocaleString()}`,
      similarityScore
    }
  };

  // Match destination to closest itinerary
  const destLower = destination.toLowerCase();
  if (destLower.includes('japan') || destLower.includes('tokyo') || destLower.includes('kyoto')) {
    return adjustItineraryForDuration(itineraries.japan, duration);
  } else if (destLower.includes('italy') || destLower.includes('rome') || destLower.includes('florence')) {
    return adjustItineraryForDuration(itineraries.italy, duration);
  } else if (destLower.includes('thailand') || destLower.includes('bangkok') || destLower.includes('phuket')) {
    return adjustItineraryForDuration(itineraries.thailand, duration);
  }

  // Default to Italy for any other destination
  return adjustItineraryForDuration({
    ...itineraries.italy,
    destination: `${destination} Journey`,
    overview: `Experience the best of ${destination} with this personalized itinerary tailored to your interests and preferences.`
  }, duration);
}

function calculateSimilarityScore(interests: string[]): number {
  // Simulate vector similarity based on number of interests
  const baseScore = 75;
  const interestBonus = Math.min(interests.length * 3, 20);
  return Math.min(baseScore + interestBonus, 98);
}

function adjustItineraryForDuration(itinerary: any, duration: number): any {
  if (duration <= 3) {
    return {
      ...itinerary,
      days: itinerary.days.slice(0, Math.min(duration, itinerary.days.length))
    };
  } else if (duration > itinerary.days.length) {
    // For longer trips, repeat some days with variations
    const extraDays = duration - itinerary.days.length;
    const additionalDays = Array.from({ length: extraDays }, (_, i) => ({
      day: itinerary.days.length + i + 1,
      title: `Day ${itinerary.days.length + i + 1} - Explore More`,
      activities: [
        {
          time: '10:00 AM',
          activity: 'Free Time',
          location: 'Your Choice',
          description: 'Explore at your own pace or revisit your favorite spots.',
          cost: 'Variable'
        },
        {
          time: '2:00 PM',
          activity: 'Local Experience',
          location: 'City Center',
          description: 'Discover hidden gems and local favorites.',
          cost: '$50'
        },
        {
          time: '7:00 PM',
          activity: 'Dinner',
          location: 'Local Restaurant',
          description: 'Enjoy regional cuisine at a recommended restaurant.',
          cost: '$40'
        }
      ]
    }));

    return {
      ...itinerary,
      days: [...itinerary.days, ...additionalDays]
    };
  }

  return itinerary;
}
