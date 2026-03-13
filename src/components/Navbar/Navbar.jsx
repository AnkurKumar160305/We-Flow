import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, Star, Calendar, LogOut, Users, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = ({ onOpenSettings, notifications = [], onClearNotifications, onMondaySync }) => {
  const { profile, workspace, settings, effectiveRole, isCreator, toggleCoCreatorMode, actingAsCoCreator, signOut } = useAuth();
  const [showBell, setShowBell] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [showNorthStar, setShowNorthStar] = useState(false);
  const bellRef = useRef();
  const avatarRef = useRef();

  const unread = notifications.filter(n => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setShowAvatar(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <nav className="navbar">
      {/* LEFT — Logo + North Star + Monday Sync */}
      <div className="nav-left">
        {workspace?.logo_url
          ? <img src={workspace.logo_url} alt="Logo" className="nav-logo-img" />
          : <div className="nav-logo-initial" style={{ background: workspace?.brand_color || 'var(--brand)' }}>{workspace?.name?.[0] || 'W'}</div>
        }
        <span className="nav-brand-name">{workspace?.name || 'WeFlow'}</span>

        {/* North Star Pill */}
        {settings?.north_star && (
          <button className="north-star-pill" onClick={() => setShowNorthStar(!showNorthStar)} title="North Star Goal">
            <Star size={11} />
            <span>{settings.north_star.length > 36 ? settings.north_star.slice(0, 36) + '…' : settings.north_star}</span>
          </button>
        )}

        {/* Monday Sync Pill */}
        <button className="monday-sync-pill" onClick={onMondaySync} title="Weekly team sync">
          <span className="status-dot online" />
          <Calendar size={11} />
          <span>Monday Sync</span>
        </button>
      </div>

      {/* RIGHT */}
      <div className="nav-right">
        {/* Notifications Bell */}
        <div className="nav-bell-wrap" ref={bellRef}>
          <button className="icon-btn nav-bell" onClick={() => setShowBell(!showBell)}>
            <Bell size={18} />
            {unread > 0 && <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>

          {showBell && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span className="notif-title">Notifications</span>
                {unread > 0 && <button className="btn btn-ghost btn-sm" onClick={onClearNotifications}>Mark all read</button>}
              </div>
              <div className="notif-list">
                {notifications.length === 0
                  ? <div className="notif-empty">No notifications yet</div>
                  : notifications.slice(0, 20).map((n, i) => (
                    <div key={i} className={`notif-item ${n.read ? 'read' : ''}`}>
                      <div className="notif-dot" />
                      <div>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        {/* Avatar + Profile Menu */}
        <div className="nav-avatar-wrap" ref={avatarRef}>
          <button className="nav-avatar" style={{ background: profile?.member_color || 'var(--sur-03)' }} onClick={() => setShowAvatar(!showAvatar)}>
            {initials}
            <ChevronDown size={10} className="avatar-chevron" />
          </button>

          {showAvatar && (
            <div className="avatar-dropdown">
              <div className="avatar-name">{profile?.name}</div>
              <div className="avatar-role" style={{ color: isCreator ? 'var(--col-todo)' : 'var(--ink-40)' }}>
                {effectiveRole === 'co-creator' && actingAsCoCreator ? '🎭 Acting as Co-Creator' : profile?.role || 'observer'}
              </div>
              <div className="avatar-divider" />
              {isCreator && (
                <button className="avatar-menu-item" onClick={() => { toggleCoCreatorMode(); setShowAvatar(false); }}>
                  <RefreshCw size={13} />
                  {actingAsCoCreator ? 'Switch back to Creator' : 'Act as Co-Creator'}
                </button>
              )}
              <button className="avatar-menu-item danger" onClick={signOut}>
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Settings */}
        {isCreator && (
          <button className="icon-btn" onClick={onOpenSettings} title="Settings">
            <Settings size={18} />
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
