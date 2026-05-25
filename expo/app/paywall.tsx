import React, { useMemo, useState } from "react";
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
import Purchases, { PACKAGE_TYPE, PurchasesPackage } from "react-native-purchases";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  Crown,
  Zap,
  Brain,
  TrendingUp,
  Shield,
  ChevronRight,
  Check,
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

type PlanKey = "annual" | "monthly";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { purchasePackage, restorePurchases, currentOffering, isLoading } =
    useRevenueCat();
  const { t } = useLanguage();
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("annual");

  const { annualPackage, monthlyPackage } = useMemo(() => {
    const pkgs = currentOffering?.availablePackages ?? [];
    const annual =
      pkgs.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL) ?? null;
    const monthly =
      pkgs.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY) ?? null;
    return { annualPackage: annual, monthlyPackage: monthly };
  }, [currentOffering]);

  const annualPrice = annualPackage?.product?.priceString ?? "$39.99";
  const monthlyPrice = monthlyPackage?.product?.priceString ?? "$9.99";

  const selectedPackage: PurchasesPackage | null =
    selectedPlan === "annual" ? annualPackage : monthlyPackage;

  const handleSelect = (plan: PlanKey) => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    setSelectedPlan(plan);
  };

  const handlePurchase = async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    try {
      const result = await purchasePackage(selectedPackage ?? undefined);
      if (result.success) {
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
        <ActivityIndicator size="large" color={colors.accent.sage} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={handleClose}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        testID="paywall-close"
      >
        <X size={20} color={colors.text.secondary} />
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
            <View style={styles.crownBadge}>
              <Crown size={30} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.title}>{t('paywall_unlock')}</Text>
          <Text style={styles.subtitle}>
            {t('paywall_subtitle')}
          </Text>

          <View style={styles.featuresContainer}>
            {FEATURES_EN.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <feature.icon size={20} color={colors.accent.sage} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
                  <Text style={styles.featureDesc}>{t(feature.descKey)}</Text>
                </View>
              </View>
            ))}
          </View>

          <PlanOption
            label={t('paywall_annual')}
            price={annualPrice}
            period={t('paywall_year')}
            trial={t('paywall_trial')}
            badge={t('paywall_save_badge')}
            selected={selectedPlan === "annual"}
            onPress={() => handleSelect("annual")}
            testID="paywall-plan-annual"
          />

          <PlanOption
            label={t('paywall_monthly')}
            price={monthlyPrice}
            period={t('paywall_month')}
            trial={t('paywall_trial')}
            selected={selectedPlan === "monthly"}
            onPress={() => handleSelect("monthly")}
            testID="paywall-plan-monthly"
          />

          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={handlePurchase}
            disabled={isPurchasing}
            activeOpacity={0.85}
            testID="paywall-purchase"
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <View style={styles.purchaseButtonInner}>
                <Text style={styles.purchaseButtonText}>
                  {t('paywall_start_trial')}
                </Text>
                <ChevronRight size={20} color="#FFF" />
              </View>
            )}
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

interface PlanOptionProps {
  label: string;
  price: string;
  period: string;
  trial: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

function PlanOption({ label, price, period, trial, badge, selected, onPress, testID }: PlanOptionProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.priceCard, selected && styles.priceCardSelected]}
      testID={testID}
    >
      {badge ? (
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>{badge}</Text>
        </View>
      ) : null}
      <View style={styles.priceRow}>
        <View style={styles.priceLeft}>
          <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
            {selected ? <Check size={14} color="#FFFFFF" /> : null}
          </View>
          <View>
            <Text style={styles.planName}>{label}</Text>
            <Text style={styles.trialText}>{trial}</Text>
          </View>
        </View>
        <View style={styles.priceRight}>
          <Text style={styles.priceAmount}>{price}</Text>
          <Text style={styles.pricePeriod}>{period}</Text>
        </View>
      </View>
    </TouchableOpacity>
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
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    alignItems: "center",
  },
  crownContainer: {
    marginBottom: 28,
  },
  crownBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent.sage,
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
    marginBottom: 36,
    lineHeight: 22,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 28,
    gap: 20,
  },
  featureRow: {
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 14,
  },
  featureIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.background.secondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.light.border,
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
    color: colors.text.secondary,
    lineHeight: 18,
  },
  priceCard: {
    width: "100%",
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    marginBottom: 12,
  },
  priceCardSelected: {
    borderColor: colors.accent.sage,
    backgroundColor: colors.background.primary,
  },
  badgePill: {
    position: "absolute" as const,
    top: -10,
    right: 14,
    backgroundColor: colors.accent.sage,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgePillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLeft: {
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.light.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    backgroundColor: colors.accent.sage,
    borderColor: colors.accent.sage,
  },
  planName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text.primary,
  },
  trialText: {
    fontSize: 12,
    color: colors.accent.sage,
    marginTop: 2,
    fontWeight: "500" as const,
  },
  priceRight: {
    flexDirection: "row" as const,
    alignItems: "baseline",
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.text.primary,
  },
  pricePeriod: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 3,
  },
  purchaseButton: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: colors.accent.sage,
    paddingVertical: 17,
    marginTop: 12,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseButtonInner: {
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
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
    backgroundColor: colors.light.border,
  },
  legalText: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: "center" as const,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
});
