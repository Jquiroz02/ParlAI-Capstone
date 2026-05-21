import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Stat({ label, value }) {
  return (
    <div className="border border-sb-border rounded-xl p-3 bg-sb-bg/80">
      <div className="text-sb-muted text-[0.75rem] uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1.5 font-extrabold text-sb-text text-lg">{value}</div>
    </div>
  );
}

function ActionCard({ title, desc, to }) {
  const content = (
    <>
      <div className="font-extrabold text-sb-text">{title}</div>
      <div className="mt-1.5 text-sb-muted text-xs leading-snug">{desc}</div>
    </>
  );
  const className =
    'text-left rounded-xl border border-sb-border bg-sb-bg/80 p-3 text-sb-text hover:border-sb-blue transition-colors cursor-pointer block w-full';
  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={className}>
      {content}
    </button>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full px-3 py-2 text-xs font-extrabold bg-sb-blue text-sb-dark border border-sb-blue'
          : 'rounded-full px-3 py-2 text-xs font-extrabold bg-sb-bg/80 text-sb-text border border-sb-border hover:border-sb-blue/60'
      }
    >
      {children}
    </button>
  );
}

export default function Profile() {
  const { user } = useAuth();

  const profileUser = useMemo(
    () => ({
      name: user?.name ?? 'Guest',
      username: user?.email?.split('@')[0] ?? 'user',
      tier: 'Silver',
      memberSince: '2026',
      balance: 124.75,
      bonus: 20.0,
      winRate: 0.54,
      totalWagered: 840.25,
      netProfit: 72.4,
    }),
    [user?.name, user?.email],
  );

  const [activeTab, setActiveTab] = useState('activity');

  const activity = useMemo(
    () => [
      {
        id: 'a1',
        title: 'Warriors vs Lakers',
        subtitle: 'Moneyline • GSW',
        amount: -10.0,
        status: 'Settled',
        time: 'Today • 11:04 AM',
      },
      {
        id: 'a2',
        title: 'Chelsea vs Arsenal',
        subtitle: 'Over 2.5 Goals',
        amount: 18.5,
        status: 'Won',
        time: 'Yesterday • 7:22 PM',
      },
      {
        id: 'a3',
        title: 'NFL Sunday Parlay',
        subtitle: '3-leg • +420',
        amount: -5.0,
        status: 'Lost',
        time: 'Feb 10 • 3:11 PM',
      },
    ],
    [],
  );

  const formatMoney = (n) =>
    n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  const initials = profileUser.name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  return (
    <div className="w-full min-w-0">
      {/* Hero */}
      <section className="rounded-xl border border-sb-border bg-sb-card p-4 mb-4 shadow-lg">
        <div className="flex gap-4 flex-wrap">
          <div
            className="w-[78px] h-[78px] rounded-[22px] border border-sb-border bg-sb-bg flex items-center justify-center flex-shrink-0"
            aria-hidden
          >
            <span className="font-extrabold text-sb-blue text-xl tracking-wide">
              {initials}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl leading-tight text-sb-text m-0 font-semibold">
                {profileUser.name}
              </h1>
              <span className="text-xs px-2.5 py-1.5 rounded-full border border-sb-border bg-sb-bg/80 text-sb-text">
                {profileUser.tier} Tier
              </span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap mt-1.5 text-sb-muted text-sm">
              <span>@{profileUser.username}</span>
              <span className="w-1 h-1 rounded-full bg-sb-muted" />
              <span>Member since {profileUser.memberSince}</span>
            </div>

            <div className="flex gap-3 items-stretch flex-wrap mt-4">
              <div className="min-w-[160px] p-3 rounded-xl border border-sb-border bg-sb-bg/80">
                <div className="text-sb-muted text-xs">Balance</div>
                <div className="text-sb-text font-extrabold text-lg mt-1">
                  {formatMoney(profileUser.balance)}
                </div>
              </div>
              <div className="min-w-[160px] p-3 rounded-xl border border-sb-border bg-sb-bg/80">
                <div className="text-sb-muted text-xs">Bonus</div>
                <div className="text-sb-text font-extrabold text-lg mt-1">
                  {formatMoney(profileUser.bonus)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
        {/* Performance panel */}
        <section className="rounded-xl border border-sb-border bg-sb-card p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm uppercase tracking-wider text-sb-text font-semibold m-0">
              Performance
            </h2>
            <span
              className={
                profileUser.netProfit >= 0
                  ? 'text-xs px-2.5 py-1.5 rounded-full border border-sb-blue bg-sb-blue/10 text-sb-blue'
                  : 'text-xs px-2.5 py-1.5 rounded-full border border-sb-error bg-sb-error-bg text-sb-error'
              }
            >
              {profileUser.netProfit >= 0 ? 'Net +' : 'Net '}
              {formatMoney(profileUser.netProfit)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Stat
              label="Win rate"
              value={`${Math.round(profileUser.winRate * 100)}%`}
            />
            <Stat
              label="Total wagered"
              value={formatMoney(profileUser.totalWagered)}
            />
            <Stat label="Tier" value={profileUser.tier} />
          </div>

          <div className="h-px bg-sb-border my-4" />

          <div className="text-xs uppercase tracking-widest text-sb-muted mb-2.5">
            Quick actions
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <ActionCard
              title="Account"
              desc="Update info, email, and 2FA"
              to="/settings"
            />
            <ActionCard
              title="Limits"
              desc="Wager limits & responsible play"
              to="/settings"
            />
            <ActionCard
              title="Notifications"
              desc="Odds alerts & promos"
              to="/settings"
            />
          </div>
        </section>

        {/* Tabs panel */}
        <section className="rounded-xl border border-sb-border bg-sb-card p-4 overflow-hidden">
          <div className="flex gap-2 pb-3 border-b border-sb-border mb-3 flex-wrap">
            <Tab
              active={activeTab === 'activity'}
              onClick={() => setActiveTab('activity')}
            >
              Recent activity
            </Tab>
            <Tab
              active={activeTab === 'rewards'}
              onClick={() => setActiveTab('rewards')}
            >
              Rewards
            </Tab>
          </div>

          {activeTab === 'activity' && (
            <div className="flex flex-col gap-2.5">
              {activity.map((a) => (
                <div
                  key={a.id}
                  className="flex gap-3 items-center justify-between border border-sb-border rounded-xl p-3 bg-sb-bg/80 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sb-text">{a.title}</div>
                    <div className="flex gap-2 items-center flex-wrap mt-1.5 text-sb-muted text-xs">
                      <span>{a.subtitle}</span>
                      <span className="w-1 h-1 rounded-full bg-sb-muted" />
                      <span>{a.status}</span>
                      <span className="w-1 h-1 rounded-full bg-sb-muted" />
                      <span>{a.time}</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-2.5 flex-shrink-0 flex-col sm:flex-row">
                    <div
                      className={
                        a.amount >= 0
                          ? 'font-extrabold text-sm text-sb-blue'
                          : 'font-extrabold text-sm text-sb-error'
                      }
                    >
                      {a.amount >= 0 ? '+' : '-'}
                      {formatMoney(Math.abs(a.amount))}
                    </div>
                    <button
                      type="button"
                      className="rounded-lg px-2.5 py-1.5 text-xs font-bold bg-sb-bg border border-sb-border text-sb-text hover:border-sb-blue"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'rewards' && (
            <div className="py-2">
              <div className="font-extrabold text-sb-text text-base mb-1">
                Rewards (stub)
              </div>
              <p className="text-sb-muted text-sm m-0">
                Later you can show tier progress, points, promos, and rewards
                history.
              </p>
              <div className="mt-4 border border-sb-border rounded-xl p-3 bg-sb-bg/80 flex flex-col gap-2.5">
                <div>
                  <div className="text-sb-muted text-xs">Tier Progress</div>
                  <div className="font-extrabold text-sb-text mt-1">
                    Silver → Gold
                  </div>
                </div>
                <div className="h-2.5 rounded-full border border-sb-border bg-sb-bg overflow-hidden">
                  <div
                    className="h-full bg-sb-blue rounded-full w-[42%]"
                    aria-hidden
                  />
                </div>
                <div className="text-sb-muted text-xs">42% complete</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
