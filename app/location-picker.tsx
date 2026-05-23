import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker } from "react-native-maps"; // react-native-maps'i import edin
import { SafeAreaView } from "react-native-safe-area-context";
import { setLocation } from "../src/locationStore";

const { width, height } = Dimensions.get("window");

export default function LocationPicker() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{
    //Seçilen koordinatları tutuyor.
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState<string>(""); //Koordinatın metinsel adres karşılığı.
  const [region, setRegion] = useState({
    //Haritanın başlangıç merkezini belirliyor.
    latitude: 39.9334,
    longitude: 32.8597,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync(); //Konum izni isteme
      if (status !== "granted") {
        Alert.alert("İzin Gerekli", "Konum izni vermeniz gerekiyor.");
        setLoading(false);
        return;
      }
      //Telefon GPS’inden gerçek koordinat alınıyor.
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      //GPS verisi parçalanıyor.
      const { latitude, longitude } = location.coords;
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      //Seçili konum state’e kaydediliyor.
      setSelectedLocation({ latitude, longitude });
      await reverseGeocode(latitude, longitude); //Koordinatı gerçek adrese çevirmek.
    } catch (error) {
      Alert.alert("Hata", "Konum alınamadı.");
    }
    setLoading(false);
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (result.length > 0) {
        const r = result[0];
        const parts = [r.street, r.district, r.city, r.country].filter(Boolean); //Adres parçaları birleştiriliyor.
        setAddress(parts.join(", ")); //Okunabilir hale getiriliyor.
      }
    } catch (error) {
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }
  };

  //Haritaya tıklanınca koordinatları alıp state’e kaydediyor ve adresi güncelliyor.
  const handleMapPress = async (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate; //Tıklanan noktanın koordinatları alınıyor.
    setSelectedLocation({ latitude, longitude }); //Pin yeni yere taşınır.
    await reverseGeocode(latitude, longitude);
  };

  const handleConfirm = () => {
    //Pin seçilmediyse kullanıcıya uyarı veriliyor.
    if (!selectedLocation) {
      Alert.alert("Hata", "Lütfen haritadan bir konum seçin.");
      return;
    }
    setLocation({
      address,
      lat: selectedLocation.latitude,
      lng: selectedLocation.longitude,
    });
    router.back(); //Konum seçildikten sonra bir önceki sayfaya dönülüyor.
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Konumunuz alınıyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={width * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Konum Seç</Text>
      </View>

      {/*Seçilen konumu gösteren pin*/}
      <MapView
        style={styles.map}
        region={region}
        onPress={handleMapPress}
        showsUserLocation
      >
        {selectedLocation && (
          <Marker coordinate={selectedLocation} pinColor="red" />
        )}
      </MapView>

      <View style={styles.bottomPanel}>
        {address ? (
          <View style={styles.addressContainer}>
            <Ionicons name="location" size={width * 0.05} color="#4F46E5" />
            <Text style={styles.addressText} numberOfLines={2}>
              {address}
            </Text>
          </View>
        ) : (
          <Text style={styles.hintText}>Haritaya tıklayarak konum seçin</Text>
        )}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selectedLocation && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!selectedLocation}
        >
          <Text style={styles.confirmButtonText}>Konumu Onayla</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: height * 0.02,
  },
  loadingText: { fontSize: width * 0.04, color: "#666" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    padding: width * 0.04,
    gap: width * 0.03,
  },
  headerTitle: { fontSize: width * 0.045, fontWeight: "bold", color: "#fff" },
  map: { flex: 1 },
  //Alt panelin stili, gölge ve padding ile öne çıkması sağlanıyor.
  bottomPanel: {
    backgroundColor: "#fff",
    padding: width * 0.05,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: width * 0.02,
    marginBottom: height * 0.015,
  },
  addressText: { fontSize: width * 0.038, color: "#1a1a1a", flex: 1 },
  hintText: {
    fontSize: width * 0.038,
    color: "#888",
    textAlign: "center",
    marginBottom: height * 0.015,
  },
  confirmButton: {
    backgroundColor: "#4F46E5",
    padding: height * 0.018,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonDisabled: { backgroundColor: "#a5b4fc" },
  confirmButtonText: {
    color: "#fff",
    fontSize: width * 0.04,
    fontWeight: "bold",
  },
});
