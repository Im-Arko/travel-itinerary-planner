export interface ItineraryDay {
  day: number;
  date: string;
  morning: {
    time: string;
    activity: string;
    location: string;
    description: string;
    cost: string;
  };
  afternoon: {
    time: string;
    activity: string;
    location: string;
    description: string;
    cost: string;
  };
  evening: {
    time: string;
    activity: string;
    location: string;
    description: string;
    cost: string;
  };
  accommodation: {
    name: string;
    type: string;
    cost: string;
  };
  tips: string[];
}

export interface SavedItinerary {
  id: string;
  title: string;
  destination: string;
  country: string;
  dateCreated: string;
  tripDates: {
    start: string;
    end: string;
  };
  isFavorite: boolean;
  rating: number;
  totalCost: string;
  days: ItineraryDay[];
  imageUrl: string;
}

export const mockSavedItineraries: SavedItinerary[] = [
  {
    id: '1',
    title: 'Tokyo Adventure',
    destination: 'Tokyo',
    country: 'Japan',
    dateCreated: '2024-01-15',
    tripDates: {
      start: '2024-03-10',
      end: '2024-03-17'
    },
    isFavorite: true,
    rating: 5,
    totalCost: '$2,850',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    days: [
      {
        day: 1,
        date: '2024-03-10',
        morning: {
          time: '9:00 AM',
          activity: 'Arrival & Check-in',
          location: 'Shinjuku District',
          description: 'Arrive at Narita Airport, take the express train to Shinjuku, and check into your hotel.',
          cost: '$150'
        },
        afternoon: {
          time: '2:00 PM',
          activity: 'Explore Shibuya Crossing',
          location: 'Shibuya',
          description: 'Experience the famous Shibuya Crossing and explore the vibrant shopping district.',
          cost: '$50'
        },
        evening: {
          time: '7:00 PM',
          activity: 'Dinner at Izakaya',
          location: 'Shinjuku',
          description: 'Enjoy authentic Japanese cuisine at a traditional izakaya pub.',
          cost: '$40'
        },
        accommodation: {
          name: 'Shinjuku Granbell Hotel',
          type: 'Boutique Hotel',
          cost: '$120'
        },
        tips: [
          'Get a Suica card for easy transportation',
          'Download Google Translate for easier communication',
          'Try the conveyor belt sushi for lunch'
        ]
      },
      {
        day: 2,
        date: '2024-03-11',
        morning: {
          time: '8:00 AM',
          activity: 'Visit Senso-ji Temple',
          location: 'Asakusa',
          description: 'Explore Tokyo\'s oldest temple and browse the traditional Nakamise shopping street.',
          cost: '$0'
        },
        afternoon: {
          time: '1:00 PM',
          activity: 'Tokyo Skytree',
          location: 'Sumida',
          description: 'Visit the iconic Tokyo Skytree for panoramic views of the city.',
          cost: '$25'
        },
        evening: {
          time: '6:30 PM',
          activity: 'Ramen Dinner & Akihabara',
          location: 'Akihabara',
          description: 'Try authentic ramen and explore the electric town of Akihabara.',
          cost: '$35'
        },
        accommodation: {
          name: 'Shinjuku Granbell Hotel',
          type: 'Boutique Hotel',
          cost: '$120'
        },
        tips: [
          'Visit Senso-ji early to avoid crowds',
          'Book Skytree tickets online in advance',
          'Akihabara is great for anime and electronics shopping'
        ]
      }
    ]
  },
  {
    id: '2',
    title: 'Santorini Escape',
    destination: 'Santorini',
    country: 'Greece',
    dateCreated: '2024-02-01',
    tripDates: {
      start: '2024-05-15',
      end: '2024-05-20'
    },
    isFavorite: true,
    rating: 5,
    totalCost: '$1,950',
    imageUrl: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800',
    days: [
      {
        day: 1,
        date: '2024-05-15',
        morning: {
          time: '10:00 AM',
          activity: 'Arrival in Oia',
          location: 'Oia',
          description: 'Arrive at Santorini Airport and transfer to your hotel in the charming village of Oia.',
          cost: '$80'
        },
        afternoon: {
          time: '3:00 PM',
          activity: 'Explore Oia Village',
          location: 'Oia',
          description: 'Wander through the picturesque white-washed streets and blue-domed churches.',
          cost: '$20'
        },
        evening: {
          time: '7:00 PM',
          activity: 'Sunset Dinner',
          location: 'Oia',
          description: 'Watch the famous Santorini sunset while dining at a cliffside restaurant.',
          cost: '$80'
        },
        accommodation: {
          name: 'Oia Mare Villas',
          type: 'Cave Hotel',
          cost: '$200'
        },
        tips: [
          'Arrive early for the best sunset viewing spots',
          'Book restaurants in advance during peak season',
          'Rent an ATV to explore the island independently'
        ]
      }
    ]
  },
  {
    id: '3',
    title: 'Bali Wellness Retreat',
    destination: 'Bali',
    country: 'Indonesia',
    dateCreated: '2024-01-20',
    tripDates: {
      start: '2024-04-01',
      end: '2024-04-10'
    },
    isFavorite: false,
    rating: 4,
    totalCost: '$1,400',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
    days: [
      {
        day: 1,
        date: '2024-04-01',
        morning: {
          time: '9:00 AM',
          activity: 'Arrival in Ubud',
          location: 'Ubud',
          description: 'Transfer from Ngurah Rai Airport to your wellness resort in Ubud.',
          cost: '$40'
        },
        afternoon: {
          time: '2:00 PM',
          activity: 'Welcome Yoga Session',
          location: 'Resort',
          description: 'Join a gentle yoga class overlooking the rice terraces.',
          cost: '$25'
        },
        evening: {
          time: '6:30 PM',
          activity: 'Balinese Massage',
          location: 'Resort Spa',
          description: 'Relax with a traditional Balinese massage and healthy dinner.',
          cost: '$50'
        },
        accommodation: {
          name: 'Fivelements Retreat',
          type: 'Wellness Resort',
          cost: '$180'
        },
        tips: [
          'Stay hydrated in the tropical climate',
          'Book spa treatments early as they fill up quickly',
          'Try the local organic cuisine'
        ]
      }
    ]
  }
];
