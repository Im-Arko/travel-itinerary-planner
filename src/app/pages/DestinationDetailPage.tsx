import { useParams, Link, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockDestinations } from '../data/mockDestinations';
import { MapPin, DollarSign, Thermometer, Tag, CheckCircle, Clock, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';

export function DestinationDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const destination = mockDestinations.find(d => d.id === id);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!destination) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Destination Not Found</h2>
          <Link to="/destinations" className="text-blue-600 hover:text-blue-700">
            Back to Destinations
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      indexed: { icon: CheckCircle, text: 'Indexed', color: 'bg-green-100 text-green-700' },
      pending: { icon: Clock, text: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
      failed: { icon: AlertCircle, text: 'Failed', color: 'bg-red-100 text-red-700' }
    };
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${badge.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{badge.text}</span>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Image */}
      <div className="relative h-96 overflow-hidden">
        <img
          src={destination.imageUrl}
          alt={destination.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back Button */}
        <Link
          to="/destinations"
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl font-bold text-white mb-2">{destination.name}</h1>
            <div className="flex items-center gap-2 text-white text-lg">
              <MapPin className="w-5 h-5" />
              {destination.country}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">About</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                {destination.description}
              </p>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Interests & Activities</h2>
              <div className="flex flex-wrap gap-3">
                {destination.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-medium capitalize"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">System Status</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Vector Embeddings</h3>
                    <p className="text-sm text-gray-600">
                      Semantic search indexing status
                    </p>
                  </div>
                  {getStatusBadge(destination.vectorStatus)}
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Data Ingestion</h3>
                    <p className="text-sm text-gray-600">
                      Destination data processing status
                    </p>
                  </div>
                  {destination.ingested ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Complete</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 text-gray-700">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Processing</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Facts */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Facts</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Budget Level</p>
                    <p className="font-semibold text-gray-800 capitalize">{destination.budget}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Thermometer className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Climate</p>
                    <p className="font-semibold text-gray-800 capitalize">{destination.climate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-semibold text-gray-800 capitalize">{destination.type}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Link
              to="/generate"
              className="block w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg text-center"
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>Generate Itinerary</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
