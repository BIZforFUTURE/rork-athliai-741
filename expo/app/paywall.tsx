import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import Purchases from "react-native-purchases";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  Crown,
  Zap,
  Brain,
  TrendingUp,
  Shield,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRevenueCat } from "@/providers/RevenueCatProvider";
import colors from "@/constants/colors";
import { useLanguage } from "@/providers/LanguageProvider";

const FEATURES_EN = [
  { icon: Brain, titleKey: 'paywall_ai_plans' as const, descKey: 'paywall_ai_plans_desc' as const },
  { icon: TrendingUp, titleKey: 'paywall_analytics' as const, descKey: 'paywall_analytics_desc' as const },
  { icon: Zap, titleKey: 'paywall_nutrition' as const, descKey: 'paywall_nutrition_desc' as const },
  { icon: Shield, titleKey: 'paywall_unlimited' as const, descKey: 'paywall_unlimited_desc' as const },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { purchasePackage, restorePurchases, currentOffering, isLoading } =
    useRevenueCat();
  const { t } = useLanguage();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);


  const annualPackage = currentOffering?.availablePackages?.[0];
  const priceString = annualPackage?.product?.priceString ?? "$19.99";

  const handlePurchase = async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    try {
      const result = await purchasePackage(annualPackage ?? undefined);
      if (result.success) {
        console.log("[Paywall] Purchase successful, closing paywall");
        if (router.canGoBack()) {
          router.back();
        }
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (isRestoring) return;
    setIsRestoring(true);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const restored = await restorePurchases();
      if (restored && router.canGoBack()) {
        router.back();
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRedeemPromo = async () => {
    if (Platform.OS === "ios") {
      try {
        await (Purchases as any).presentCodeRedemptionSheet?.();
      } catch (error: any) {
        console.error("[Paywall] Promo code error:", error);
      }
    } else if (Platform.OS === "android") {
      Alert.alert("Redeem Code", "Please redeem your promo code through the Google Play Store.");
    }
  };

  const handleClose = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent.teal} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#091517", "#0C1E1F", "#091517"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={handleClose}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        testID="paywall-close"
      >
        <X size={22} color={colors.text.secondary} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.crownContainer}>
          <LinearGradient
            colors={["#00ADB5", "#0891B2"]}
            style={styles.crownBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Crown size={32} color="#FFF" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>{t('paywall_unlock')}</Text>
        <Text style={styles.subtitle}>
          {t('paywall_subtitle')}
        </Text>

        <View style={styles.featuresContainer}>
          {FEATURES_EN.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <feature.icon size={20} color={colors.accent.teal} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
                <Text style={styles.featureDesc}>{t(feature.descKey)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.priceCard}>
          <LinearGradient
            colors={["#1F2937", "#0C1E1F"]}
            style={styles.priceCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.planName}>{t('paywall_annual')}</Text>
                <Text style={styles.trialText}>{t('paywall_trial')}</Text>
              </View>
              <View style={styles.priceRight}>
                <Text style={styles.priceAmount}>{priceString}</Text>
                <Text style={styles.pricePeriod}>{t('paywall_year')}</Text>
              </View>
            </View>
            <View style={styles.weeklyBreakdownRow}>
              <Text style={styles.weeklyBreakdownLabel}>$0.38/week</Text>
            </View>
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={isPurchasing}
          activeOpacity={0.85}
          testID="paywall-purchase"
        >
          <LinearGradient
            colors={["#00ADB5", "#0891B2"]}
            style={styles.purchaseButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={styles.purchaseButtonText}>
                  {t('paywall_start_trial')}
                </Text>
                <ChevronRight size={20} color="#FFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomLinks}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
            testID="paywall-restore"
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            ) : (
              <Text style={styles.restoreText}>{t('paywall_restore')}</Text>
            )}
          </TouchableOpacity>

          {Platform.OS !== "web" && (
            <>
              <View style={styles.linkDivider} />
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRedeemPromo}
                testID="paywall-promo"
              >
                <Text style={styles.restoreText}>{t('paywall_redeem')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.legalText}>
          {t('paywall_legal')}
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
  },
  closeButton: {
    position: "absolute" as const,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  crownContainer: {
    marginBottom: 24,
  },
  crownBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.text.primary,
    textAlign: "center" as const,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: "center" as const,
    marginBottom: 32,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 28,
    gap: 16,
  },
  featureRow: {
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 14,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0, 173, 181, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text.primary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  priceCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(0, 173, 181, 0.25)",
    marginBottom: 20,
  },
  priceCardGradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  priceRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.text.primary,
  },
  trialText: {
    fontSize: 13,
    color: colors.accent.teal,
    marginTop: 2,
    fontWeight: "500" as const,
  },
  priceRight: {
    flexDirection: "row" as const,
    alignItems: "baseline",
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: colors.text.primary,
  },
  pricePeriod: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 2,
  },
  purchaseButton: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden" as const,
    marginBottom: 16,
  },
  purchaseButtonGradient: {
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 6,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFF",
  },
  bottomLinks: {
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 4,
  },
  restoreButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  restoreText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  linkDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  weeklyBreakdownRow: {
    flexDirection: "row" as const,
    justifyContent: "center",
    marginTop: 8,
  },
  weeklyBreakdownLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.accent.teal,
  },
  legalText: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: "center" as const,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
});
