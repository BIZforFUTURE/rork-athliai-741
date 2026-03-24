import { Redirect } from "expo-router";
import { useApp } from "@/providers/AppProvider";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { hasSeenWelcome, isLoading } = useApp();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return <Redirect href={hasSeenWelcome ? "/(tabs)/home" : "/welcome"} />;
}
