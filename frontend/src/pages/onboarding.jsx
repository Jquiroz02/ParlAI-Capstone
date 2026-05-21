import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Onboarding = () => {
  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  // Data from backend
  const [availableTeams, setAvailableTeams] = useState([]);
  const [azureUserId, setAzureUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // fetch auth and teams from backend
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const authRes = await fetch('/.auth/me');
        const authData = await authRes.json();
        if (authData.clientPrincipal) {
          const id = authData.clientPrincipal.userId;
          setAzureUserId(id);
        }
      } catch (err) {
        console.error('Failed to fetch user auth', err);
      }
    };

    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams');
        if (res.ok) {
          const data = await res.json();
          setAvailableTeams(data);
        }
      } catch (err) {
        console.error('Failed to fetch teams', err);
      }
    };

    fetchUser();
    fetchTeams();
  }, []);

  const toggleTeam = (teamId) => {
    setSelectedTeamIds(
      (prev) =>
        prev.includes(teamId)
          ? prev.filter((id) => id !== teamId) // Remove if already selected
          : [...prev, teamId], // Add if not selected
    );
  };

  const handleNextStep = (e) => {
    e.preventDefault();

    const cleanNickname = nickname.trim();

    if (cleanNickname === '') {
      setError('Nickname is required!');
      return;
    }

    if (cleanNickname.length < 3) {
      setError('Nickname must be at least 3 characters long.');
      return;
    }

    if (cleanNickname.length > 15) {
      setError('Nickname cannot be more than 15 characters.');
      return;
    }

    const isValidFormat = /^[a-zA-Z0-9_]+$/.test(cleanNickname);
    if (!isValidFormat) {
      setError('Nickname can only contain letters, numbers, and underscores.');
      return;
    }

    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          azureUserId,
          nickname,
          teamIds: selectedTeamIds,
        }),
      });

      const data = await response.json();

      // Duplicate Nickname conflict
      if (response.status === 409) {
        setError(data.error);
        return;
      }

      // Catch any other random server errors
      if (!response.ok) {
        setError(data.error || 'Something went wrong saving your profile.');
        return;
      }

      // SUCCESS
      console.log('Success:', data.message);

      await checkAuth();

      navigate('/dashboard');
    } catch (error) {
      console.error('Network error:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };
  if (!azureUserId) return <div>Loading user session...</div>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-black border rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center text-sb-blue">
        Welcome to ParlAI!
      </h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      {/* Set up nickname */}
      {step === 1 && (
        <form onSubmit={handleNextStep}>
          <h2 className="text-lg font-semibold mb-4">
            Choose your display name
          </h2>
          <div className="mb-4">
            <label className="block text-white mb-2">Nickname</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="BettingGuru123"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full bg-sb-blue-dark text-white p-2 rounded hover:bg-sb-blue-light cursor-pointer"
          >
            Next
          </button>
        </form>
      )}

      {/* select favorite teams */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Step 2: Pick your favorite teams
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Select the teams you want to follow closely.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6 max-h-60 overflow-y-auto">
            {availableTeams.length > 0 ? (
              availableTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggleTeam(team.id)}
                  className={`flex items-center justify-center gap-2 p-3 border rounded text-sm cursor-pointer ${
                    selectedTeamIds.includes(team.id)
                      ? 'bg-black border border-sb-blue text-sb-blue font-bold'
                      : 'bg-sb-blue border border-sb-blue hover:bg-sb-blue-light text-black font-bold'
                  }`}
                >
                  {/* Logo  */}
                  {team.logoUrl && (
                    <img
                      src={team.logoUrl}
                      alt={`${team.name} logo`}
                      className="w-6 h-6 object-contain"
                    />
                  )}
                  <span>{team.name}</span>
                </button>
              ))
            ) : (
              <p className="col-span-2 text-center text-gray-500">
                Loading teams...
              </p>
            )}
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-white border rounded hover:bg-gray-900 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-sb-blue rounded hover:bg-sb-blue-light text-black disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Saving...' : 'Finish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
