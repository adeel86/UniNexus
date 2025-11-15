import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { currentUser, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#EC4899', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>UniNexus</Text>
        <Text style={styles.subtitle}>Welcome back!</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          Hello, {currentUser?.displayName || currentUser?.email}!
        </Text>
        <Text style={styles.infoText}>
          You're now logged in to UniNexus mobile app.
        </Text>
        <Text style={[styles.infoText, { marginTop: 20 }]}>
          This is a basic authentication demo. Future versions will include:
        </Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>• Social feed with posts and comments</Text>
          <Text style={styles.featureItem}>• Gamified profile with badges</Text>
          <Text style={styles.featureItem}>• AI-powered career guidance</Text>
          <Text style={styles.featureItem}>• Course discussions</Text>
          <Text style={styles.featureItem}>• Leaderboards and challenges</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  featureList: {
    marginTop: 12,
    marginLeft: 8,
  },
  featureItem: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 22,
  },
  button: {
    marginTop: 32,
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
