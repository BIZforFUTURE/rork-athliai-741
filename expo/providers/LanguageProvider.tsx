import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { translations, Language, TranslationKey } from "@/constants/translations";

const LANGUAGE_KEY = "@app_language";

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [language, setLanguageState] = useState<Language>("en");

  const { data: storedLanguage } = useQuery({
    queryKey: ["language"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      return (stored as Language) || "en";
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (lang: Language) => {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      return lang;
    },
  });

  useEffect(() => {
    if (storedLanguage) {
      setLanguageState(storedLanguage);
    }
  }, [storedLanguage]);

  const setLanguage = useCallback(
    (lang: Language) => {
      console.log("Setting language to:", lang);
      setLanguageState(lang);
      saveMutation.mutate(lang);
    },
    [saveMutation]
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let text: string = translations[language][key] ?? translations.en[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [language]
  );

  const isSpanish = language === "es";
  const isPortuguese = language === "pt";

  return useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isSpanish,
      isPortuguese,
    }),
    [language, setLanguage, t, isSpanish, isPortuguese]
  );
});
