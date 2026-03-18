import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Platform, Alert } from "react-native";
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";

const ENTITLEMENT_ID = "AthliAI Premium";

function getRCApiKey(): string {
  if (Platform.OS === "web") {
    return "";
  }
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "";

  return Platform.select({
    ios: iosKey,
    android: androidKey,
    default: iosKey,
  }) as string;
}

const apiKey = getRCApiKey();

if (apiKey) {
  void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  console.log("[RevenueCat] Configured with platform:", Platform.OS);
} else {
  console.warn("[RevenueCat] No API key found for platform:", Platform.OS);
}

export const [RevenueCatProvider, useRevenueCat] = createContextHook(() => {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkPremiumStatus = useCallback((info: CustomerInfo) => {
    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    const hasPremium = !!entitlement;
    console.log("[RevenueCat] Premium status:", hasPremium);
    setIsPremium(hasPremium);
    setCustomerInfo(info);
  }, []);

  useEffect(() => {
    if (!apiKey) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        checkPremiumStatus(info);

        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setCurrentOffering(offerings.current);
          console.log(
            "[RevenueCat] Loaded offering:",
            offerings.current.identifier,
            "packages:",
            offerings.current.availablePackages.length
          );
        } else {
          console.warn("[RevenueCat] No current offering found");
        }
      } catch (error) {
        console.error("[RevenueCat] Init error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void init();

    Purchases.addCustomerInfoUpdateListener((info) => {
      console.log("[RevenueCat] Customer info updated");
      checkPremiumStatus(info);
    });
  }, [checkPremiumStatus]);

  const purchasePackage = useCallback(
    async (pkg?: PurchasesPackage) => {
      if (!apiKey) {
        Alert.alert("Error", "In-app purchases are not configured.");
        return { success: false };
      }

      const targetPkg =
        pkg ?? currentOffering?.availablePackages?.[0] ?? null;

      if (!targetPkg) {
        Alert.alert(
          "Error",
          "No subscription package available. Please try again later."
        );
        return { success: false };
      }

      try {
        console.log("[RevenueCat] Purchasing:", targetPkg.identifier);
        const { customerInfo: info } =
          await Purchases.purchasePackage(targetPkg);
        checkPremiumStatus(info);

        if (info.entitlements.active[ENTITLEMENT_ID]) {
          console.log("[RevenueCat] Purchase successful!");
          return { success: true };
        }
        return { success: false };
      } catch (error: any) {
        if (error.userCancelled) {
          console.log("[RevenueCat] Purchase cancelled by user");
          return { success: false };
        }
        console.error("[RevenueCat] Purchase error:", error);
        Alert.alert(
          "Purchase Failed",
          "Something went wrong. Please try again later."
        );
        return { success: false };
      }
    },
    [currentOffering, checkPremiumStatus]
  );

  const restorePurchases = useCallback(async () => {
    if (!apiKey) {
      Alert.alert("Error", "In-app purchases are not configured.");
      return false;
    }

    try {
      console.log("[RevenueCat] Restoring purchases...");
      const info = await Purchases.restorePurchases();
      checkPremiumStatus(info);

      if (info.entitlements.active[ENTITLEMENT_ID]) {
        Alert.alert("Restored!", "Your premium subscription has been restored.");
        return true;
      } else {
        Alert.alert(
          "No Subscription Found",
          "We couldn't find an active subscription for this account."
        );
        return false;
      }
    } catch (error) {
      console.error("[RevenueCat] Restore error:", error);
      Alert.alert("Error", "Failed to restore purchases. Please try again.");
      return false;
    }
  }, [checkPremiumStatus]);

  return useMemo(
    () => ({
      isPremium,
      isLoading,
      currentOffering,
      customerInfo,
      purchasePackage,
      restorePurchases,
    }),
    [
      isPremium,
      isLoading,
      currentOffering,
      customerInfo,
      purchasePackage,
      restorePurchases,
    ]
  );
});
