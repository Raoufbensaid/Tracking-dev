// app/adresse.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, Button, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";

// Votre clé API Google pour la géocodification
const GOOGLE_API_KEY = "AIzaSyCDz7ffM0xAeZ-FK0gs5aep5NWy9fk7eYw";

// Fonction asynchrone pour géocoder une adresse avec l'API Google Geocoding
async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number }> {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === "OK" && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { latitude: location.lat, longitude: location.lng };
    } else {
      throw new Error(`Geocoding error: ${data.status}`);
    }
  } catch (error) {
    console.error("Erreur de géocodage pour l'adresse:", address, error);
    // En cas d'erreur, on retourne Paris comme valeur par défaut
    return { latitude: 48.8566, longitude: 2.3522 };
  }
}

// Fonction pour traiter toutes les lignes du CSV et renvoyer un tableau d'objets
// contenant latitude, longitude, addressComplete et nbLogements.
const processAddresses = async (
  dataLines: string[]
): Promise<
  {
    latitude: number;
    longitude: number;
    addressComplete: string;
    nbLogements: string;
  }[]
> => {
  const results = await Promise.all(
    dataLines.map(async (line: string, index: number) => {
      // Découper la ligne par virgule
      const fields = line.split(",").map((f) => f.trim());
      // On suppose que l'index 5 correspond à NB_LOGEMENTS et l'index 6 à Adresses complétes
      const nbLogements = fields[5] || "";
      const addressComplete = fields[6] || "";
      console.log(
        `Ligne ${index} - Adresse extraite: "${addressComplete}", NB_LOGEMENTS: "${nbLogements}"`
      );
      if (!addressComplete) return null;
      const coords = await geocodeAddress(addressComplete);
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        addressComplete,
        nbLogements,
      };
    })
  );
  return results.filter((r) => r !== null) as {
    latitude: number;
    longitude: number;
    addressComplete: string;
    nbLogements: string;
  }[];
};

export default function AdresseScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const pickCsv = async () => {
    try {
      setLoading(true);
      const result = (await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: [
          "text/csv",
          "text/plain",
          "application/csv",
          "application/vnd.ms-excel",
          "*/*",
        ],
      })) as any;

      console.log("DocumentPicker result:", result);
      if (result.canceled) {
        setLoading(false);
        Alert.alert("Annulé", "Aucun fichier sélectionné.");
        return;
      }
      if (!result.assets || result.assets.length === 0) {
        setLoading(false);
        Alert.alert("Erreur", "Aucun fichier détecté.");
        return;
      }

      const file = result.assets[0];
      console.log("Fichier sélectionné:", file.uri);
      const content = await FileSystem.readAsStringAsync(file.uri);
      console.log("Contenu CSV:", content);

      // Découper le contenu par lignes et filtrer les lignes vides
      const lines = content
        .split("\n")
        .filter((line: string) => line.trim() !== "");
      console.log("Lignes CSV:", lines);

      // Supposer que la première ligne est l'en-tête et l'ignorer
      const dataLines = lines.slice(1);
      console.log("Lignes de données:", dataLines);

      const addresses = await processAddresses(dataLines);
      console.log("Adresses géocodées:", addresses);
      setLoading(false);
      if (addresses.length === 0) {
        Alert.alert(
          "Erreur",
          "Aucune adresse valide trouvée dans le fichier CSV."
        );
        return;
      }

      // Naviguer vers la page addressMap en passant les adresses en paramètre
      router.push({
        pathname: "/AddressMapGoogle",
        params: { addresses: JSON.stringify(addresses) },
      });
    } catch (error) {
      console.error("Erreur lors de l'import CSV:", error);
      setLoading(false);
      Alert.alert("Erreur", "L'import du fichier CSV a échoué.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adressé</Text>
      <Button title="Importer CSV" onPress={pickCsv} />
      {loading && <Text>Chargement...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});
