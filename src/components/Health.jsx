import { useState, useEffect } from 'react';

const Health = () => {
  const [health, setHealth] = useState('Checking...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const url = `${import.meta.env.VITE_API_URL}/health`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setHealth(data.status || 'OK');
      } catch (error) {
        console.error('Health check error:', error);
        setHealth('Failed');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return (
    <div className="bg-slate-900 rounded-2xl shadow-lg p-6 border border-slate-800">
      <h2 className="text-2xl font-bold text-white mb-3">API Health</h2>
      <div className="flex items-center justify-between">
        <span className="text-slate-300">Status:</span>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            health === 'OK' ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className={`font-semibold ${
            health === 'OK' ? 'text-green-400' : 'text-red-400'
          }`}>
            {loading ? 'Checking...' : health}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Health;