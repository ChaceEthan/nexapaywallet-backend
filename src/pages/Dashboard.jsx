import { useAuth } from '../context/AuthContext';
import WalletConnect from '../components/WalletConnect';
import Health from '../components/Health';
import DepositComponent from '../components/DepositComponent';
import TransactionComponent from '../components/TransactionComponent';
import SetValue from '../components/SetValue';
import GetValue from '../components/GetValue';

const Dashboard = () => {
  const { userEmail, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">NexaPay Dashboard</h1>
            {userEmail && <p className="text-slate-400">Welcome back, {userEmail}</p>}
          </div>
          <div className="flex items-center space-x-4">
            <WalletConnect />
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6">
          <Health />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 rounded-2xl shadow-lg p-6 border border-slate-800 hover:border-purple-700 transition">
            <DepositComponent />
          </div>
          <div className="bg-slate-900 rounded-2xl shadow-lg p-6 border border-slate-800 hover:border-purple-700 transition">
            <TransactionComponent />
          </div>
          <div className="bg-slate-900 rounded-2xl shadow-lg p-6 border border-slate-800 hover:border-purple-700 transition">
            <SetValue />
          </div>
          <div className="bg-slate-900 rounded-2xl shadow-lg p-6 border border-slate-800 hover:border-purple-700 transition">
            <GetValue />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;