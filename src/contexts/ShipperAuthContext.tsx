import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface ShipperProfile {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
}

interface ShipperAuthContextValue {
  user: User | null;
  session: Session | null;
  profile: ShipperProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    companyName: string,
    contactName?: string,
    phone?: string
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ShipperAuthContext = createContext<ShipperAuthContextValue | undefined>(
  undefined
);

export const ShipperAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ShipperProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("shipper_profiles" as never)
      .select("id, company_name, contact_name, phone")
      .eq("id", uid)
      .maybeSingle();
    if (!error && data) {
      setProfile(data as unknown as ShipperProfile);
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: ShipperAuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signUp: ShipperAuthContextValue["signUp"] = async (
    email,
    password,
    companyName,
    contactName,
    phone
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: companyName, contact_name: contactName, phone },
      },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Sign-up did not return a user" };

    const { error: pErr } = await supabase
      .from("shipper_profiles" as never)
      .upsert({
        id: data.user.id,
        company_name: companyName,
        contact_name: contactName ?? null,
        phone: phone ?? null,
      } as never);
    if (pErr) return { error: `Profile creation failed: ${pErr.message}` };

    await fetchProfile(data.user.id);
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const isAdmin = Boolean(
    (user?.app_metadata as { role?: string } | undefined)?.role === "admin"
  );

  return (
    <ShipperAuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </ShipperAuthContext.Provider>
  );
};

export const useShipperAuth = () => {
  const ctx = useContext(ShipperAuthContext);
  if (!ctx) {
    throw new Error("useShipperAuth must be used within ShipperAuthProvider");
  }
  return ctx;
};
