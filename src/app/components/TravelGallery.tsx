import { motion } from 'motion/react';

const destinations = [
  {
    name: 'Tokyo, Japan',
    description: 'Modern cities meet ancient traditions',
    imageUrl: 'https://images.unsplash.com/photo-1703443371292-0d9081cc4787?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b2t5byUyMGphcGFuJTIwdGVtcGxlfGVufDF8fHx8MTc3OTEwMTU0OXww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    name: 'Santorini, Greece',
    description: 'Stunning sunsets over the Aegean Sea',
    imageUrl: 'https://images.unsplash.com/photo-1688664562000-4c1f7cdb48f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYW50b3JpbmklMjBncmVlY2UlMjBzdW5zZXR8ZW58MXx8fHwxNzc5MTAxNTUwfDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    name: 'Machu Picchu, Peru',
    description: 'Ancient Incan citadel in the clouds',
    imageUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWNodSUyMHBpY2NodSUyMHBlcnV8ZW58MXx8fHwxNzc5MTAxNTUwfDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    name: 'Paris, France',
    description: 'Romance and culture in the City of Light',
    imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXJpcyUyMGVpZmZlbCUyMHRvd2VyfGVufDF8fHx8MTc3OTA3MjM5NXww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    name: 'Bali, Indonesia',
    description: 'Tropical paradise with vibrant culture',
    imageUrl: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWxpJTIwaW5kb25lc2lhJTIwYmVhY2h8ZW58MXx8fHwxNzc5MTAxNTUxfDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    name: 'Iceland',
    description: 'Land of fire, ice, and northern lights',
    imageUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpY2VsYW5kJTIwbm9ydGhlcm4lMjBsaWdodHN8ZW58MXx8fHwxNzc5MTAxNTUxfDA&ixlib=rb-4.1.0&q=80&w=1080'
  }
];

export function TravelGallery() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-serif">
            Discover Your Dream Destination
          </h2>
          <p className="text-xl text-neutral-600">
            From bustling cities to serene beaches, the world is waiting for you
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((destination, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              className="group relative overflow-hidden rounded-2xl shadow-xl aspect-[4/5] bg-gray-200"
            >
              <img
                src={destination.imageUrl}
                alt={destination.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-2xl font-bold mb-2">{destination.name}</h3>
                <p className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                  {destination.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <div className="inline-block bg-white rounded-2xl shadow-warm-lg px-8 py-6 border border-neutral-100">
            <p className="text-2xl font-semibold text-neutral-800 mb-2 font-serif">
              Ready to plan your perfect trip?
            </p>
            <p className="text-neutral-600">
              Keep scrolling to start building your personalized itinerary
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
