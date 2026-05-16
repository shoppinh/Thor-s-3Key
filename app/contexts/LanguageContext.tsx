import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState
} from 'react';
import en from '../locales/en';
import vi from '../locales/vi';

type Language = 'en' | 'vi';
type TranslationNode = string | { [key: string]: TranslationNode };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, options?: Record<string, unknown>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  // Optional: Persist language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('app-language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'vi')) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (path: string, options?: Record<string, unknown>): string => {
    const keys = path.split('.');
    let current: TranslationNode = language === 'en' ? en : vi;

    for (const key of keys) {
      if (typeof current === 'string' || current[key] === undefined) {
        console.warn(
          `Translation missing for key: ${path} in language: ${language}`
        );
        return path;
      }
      current = current[key];
    }

    if (options) {
      Object.keys(options).forEach((key) => {
        if (options[key]) {
          current =
            typeof current === 'string'
              ? current.replace(`{{${key}}}`, String(options[key]))
              : current;
        }
      });
    }
    return typeof current === 'string' ? current : path;
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
