import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Platform, Alert } from "react-native";
import { useApp } from "./AppProvider";
import * as Linking from "expo-linking";

const REVENUECAT_API_KEY = "appl_cyGTZILgAZKTgfzcpRDRAnwrDok";
const ENTITLEMENT_ID = "AthliAI Premium";
const PRODUCT_ID = "Oliver20011";
const OFFERING_ID = "default";

interface Entitlement {
  expires_date: string | null;
  product_identifier: string;
  purchase_date: string;
}

interface CustomerInfo {
  subscriber: {
    entitlements: {
      [key: string]: Entitlement;
    };
    subscriptions: {
      [key: string]: {
        expires_date: string | null;
        purchase_date: string;
        billing_issues_detected_at: string | null;
      };
    };
  };
}

export const [RevenueCatProvider, useRevenueCat] = createContextHook(() => {
  const { user } = useApp();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${user.id}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${REVENUECAT_API_KEY}`,
            "Content-Type": "application/json",
            "X-Platform": Platform.OS === "ios" ? "ios" : "android",
          },
        }
      );

      if (response.ok) {
        const data: CustomerInfo = await response.json();
        setCustomerInfo(data);

        const entitlement = data.subscriber?.entitlements?.[ENTITLEMENT_ID];
        if (entitlement) {
          const expiresDate = entitlement.expires_date;
          if (!expiresDate || new Date(expiresDate) > new Date()) {
            setIsPremium(true);
          } else {
            setIsPremium(false);
          }
        } else {
          setIsPremium(false);
        }
      } else if (response.status === 404) {
        setIsPremium(false);
        setCustomerInfo(null);
      } else {
        console.error("Error checking subscription:", response.status);
      }
    } catch (error) {
      console.error("Error checking subscription status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  const restorePurchases = useCallback(async () => {
    setIsLoading(true);
    await checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  const getOfferings = useCallback(async () => {
    try {
      const response = await fetch(
        "https://api.revenuecat.com/v1/offerings",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${REVENUECAT_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching offerings:", error);
      return null;
    }
  }, []);

  const purchasePackage = useCallback(async () => {
    if (!user?.id) {
      Alert.alert("Error", "User not found. Please try again.");
      return { success: false };
    }

    try {
      console.log("Initiating purchase for user:", user.id);
      
      if (Platform.OS === 'ios') {
        const url = `https://buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/manageSubscriptions`;
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
          
          setTimeout(() => {
            Alert.alert(
              "Purchase Complete?",
              "If you completed the purchase, tap 'Yes' to refresh your subscription status.",
              [
                {
                  text: "Not Yet",
                  style: "cancel"
                },
                {
                  text: "Yes",
                  onPress: async () => {
                    await checkSubscriptionStatus();
                  }
                }
              ]
            );
          }, 2000);
          
          return { success: true };
        } else {
          Alert.alert("Error", "Unable to open App Store. Please try again.");
          return { success: false };
        }
      } else if (Platform.OS === 'android') {
        const url = 'https://play.google.com/store/account/subscriptions';
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
          
          setTimeout(() => {
            Alert.alert(
              "Purchase Complete?",
              "If you completed the purchase, tap 'Yes' to refresh your subscription status.",
              [
                {
                  text: "Not Yet",
                  style: "cancel"
                },
                {
                  text: "Yes",
                  onPress: async () => {
                    await checkSubscriptionStatus();
                  }
                }
              ]
            );
          }, 2000);
          
          return { success: true };
        } else {
          Alert.alert("Error", "Unable to open Play Store. Please try again.");
          return { success: false };
        }
      } else {
        Alert.alert(
          "Web Platform",
          "In-app purchases are only available on iOS and Android. Please download the mobile app."
        );
        return { success: false };
      }
    } catch (error) {
      console.error("Error initiating purchase:", error);
      Alert.alert(
        "Purchase Error",
        "Unable to complete purchase. Please try again later."
      );
      return { success: false };
    }
  }, [user?.id, checkSubscriptionStatus]);

  return useMemo(() => ({
    isPremium,
    isLoading,
    customerInfo,
    checkSubscriptionStatus,
    restorePurchases,
    getOfferings,
    purchasePackage,
  }), [isPremium, isLoading, customerInfo, checkSubscriptionStatus, restorePurchases, getOfferings, purchasePackage]);
});
