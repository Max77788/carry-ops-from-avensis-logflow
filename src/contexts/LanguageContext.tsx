import React, { createContext, useContext, useState, useEffect } from "react";
import type { Language } from "@/lib/localization";
import { getTranslation } from "@/lib/localization";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (path: string) => string;
  showLanguageSelector: boolean;
  setShowLanguageSelector: (show: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(true);
  const [showLanguageSelector, setShowLanguageSelectorState] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    const storedLanguage = localStorage.getItem("language") as Language | null;
    const hasSelectedLanguage = localStorage.getItem("languageSelected");

    if (
      storedLanguage &&
      (storedLanguage === "en" || storedLanguage === "es")
    ) {
      setLanguageState(storedLanguage);
    } else {
      // Default to English if not set
      setLanguageState("en");
    }

    // Show language selector on first load if user hasn't selected a language
    if (!hasSelectedLanguage) {
      setShowLanguageSelectorState(true);
    }

    setIsLoading(false);
  }, []);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem("language", newLanguage);
    localStorage.setItem("languageSelected", "true");
    setShowLanguageSelectorState(false);
  };

  const t = (path: string): string => {
    return getTranslation(language, path);
  };

  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        showLanguageSelector,
        setShowLanguageSelector: setShowLanguageSelectorState,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
