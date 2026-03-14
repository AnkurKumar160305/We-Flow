import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

// 8 fixed member colors per PRD
const MEMBER_COLORS = [
  '#C47B5A', '#5B8DB8', '#7B6BA8', '#4F8A6C',
  '#C49A3C', '#B85B7A', '#3B8A8A', '#7A5A3A'
];

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);         // Supabase auth user
  const [profile, setProfile] = useState(null);   // users table row (workspace member)
  const [workspace, setWorkspace] = useState(null); // workspaces table row
  const [settings, setSettings] = useState(null);   // settings table row
  const [members, setMembers] = useState([]);        // all workspace members
  const [loading, setLoading] = useState(true);
  // session-only Co-Creator mode toggle (Creator only)
  const [actingAsCoCreator, setActingAsCoCreator] = useState(false);

  const fetchWorkspaceData = useCallback(async (authUser) => {
    try {
      // 1. Fetch user's profile row from public.users
      const { data: userRows } = await supabase
        .from('users')
        .select('*, workspaces(*)')
        .eq('account_id', authUser.id)
        .limit(1);

      if (!userRows || userRows.length === 0) {
        // No workspace yet — user needs onboarding
        setProfile(null);
        setWorkspace(null);
        setLoading(false);
        return;
      }

      const userRow = userRows[0];
      setProfile(userRow);
      setWorkspace(userRow.workspaces);

      // 2. Fetch sprint settings
      const { data: settingsRow } = await supabase
        .from('settings')
        .select('*')
        .eq('workspace_id', userRow.workspace_id)
        .single();
      setSettings(settingsRow || null);

      // 3. Fetch all workspace members
      const { data: memberRows } = await supabase
        .from('users')
        .select('*')
        .eq('workspace_id', userRow.workspace_id);
      setMembers(memberRows || []);

    } catch (err) {
      console.error('fetchWorkspaceData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setUser(currentSession.user);
        fetchWorkspaceData(currentSession.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser(newSession.user);
        fetchWorkspaceData(newSession.user);
      } else {
        setUser(null);
        setProfile(null);
        setWorkspace(null);
        setSettings(null);
        setMembers([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchWorkspaceData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setActingAsCoCreator(false);
  };

  const createWorkspace = async ({ name, logoUrl, brandColor }) => {
    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name,
        logo_url: logoUrl,
        brand_color: brandColor || '#F36B21',
        founding_creator_id: user.id,
      })
      .select()
      .single();
    if (data) setWorkspace(data);
    return { data, error };
  };

  const createUserProfile = async ({ workspaceId, name, role = 'creator' }) => {
    const usedColors = members.map(m => m.member_color);
    const color = MEMBER_COLORS.find(c => !usedColors.includes(c)) || MEMBER_COLORS[0];
    const { data, error } = await supabase
      .from('users')
      .insert({
        workspace_id: workspaceId,
        account_id: user.id,
        name,
        role,
        member_color: color,
        status: 'active',
      })
      .select()
      .single();
    if (data) setProfile(data);
    return { data, error };
  };

  const createSettings = async ({ workspaceId, sprintName, sprintStart, sprintEnd, northStar }) => {
    const { data, error } = await supabase
      .from('settings')
      .insert({
        workspace_id: workspaceId,
        sprint_name: sprintName,
        sprint_start: sprintStart,
        sprint_end: sprintEnd,
        north_star: northStar || '',
      })
      .select()
      .single();
    if (data) setSettings(data);
    return { data, error };
  };

  const updateSettings = async (updates) => {
    if (!settings?.id) return { error: 'No settings found' };
    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('id', settings.id)
      .select()
      .single();
    if (data) setSettings(data);
    return { data, error };
  };

  const updateWorkspace = async (updates) => {
    if (!workspace?.id) return { error: 'No workspace found' };
    const { data, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', workspace.id)
      .select()
      .single();
    if (data) setWorkspace(data);
    return { data, error };
  };

  const refreshMembers = async () => {
    if (!profile?.workspace_id) return;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('workspace_id', profile.workspace_id);
    if (data) setMembers(data);
  };

  const toggleCoCreatorMode = () => {
    if (profile?.role === 'creator') {
      setActingAsCoCreator(prev => !prev);
    }
  };

  // Effective role — creator acting as co-creator is treated as co-creator
  const effectiveRole = actingAsCoCreator && profile?.role === 'creator'
    ? 'co-creator'
    : (profile?.role || 'observer');

  const isCreator = profile?.role === 'creator';
  const isFoundingCreator = workspace?.founding_creator_id === user?.id;
  const isMissingWorkspace = !loading && user && !profile;

  return (
    <AuthContext.Provider value={{
      session, user, profile, workspace, settings, members,
      loading, actingAsCoCreator, effectiveRole,
      isCreator, isFoundingCreator, isMissingWorkspace,
      signOut,
      createWorkspace, createUserProfile, createSettings,
      updateSettings, updateWorkspace, refreshMembers,
      toggleCoCreatorMode,
      MEMBER_COLORS,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useLocationAuth = () => useContext(AuthContext); // temp fallback name
export const useAuth = () => useContext(AuthContext);
export const useWorkspaceAuth = () => useContext(AuthContext);
