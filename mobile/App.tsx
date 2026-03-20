import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.center}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>₩</Text>
          </View>
          <Text style={styles.title}>PocketPay</Text>
          <Text style={styles.subtitle}>소모임 공금, 이제 투명하게.</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#3DD598",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#191F28",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8B95A1",
    textAlign: "center",
  },
});
