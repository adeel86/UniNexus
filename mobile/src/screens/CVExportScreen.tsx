import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, spacing, typography, borderRadius } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, Badge, Button } from '../components/ui';
import type { User, UserBadge, UserSkill } from '../config/types';

interface ProfileData extends User {
  badges: UserBadge[];
  skills: UserSkill[];
}

export default function CVExportScreen() {
  const { currentUser } = useAuth();
  const navigation = useNavigation<any>();
  const [exporting, setExporting] = useState(false);

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ['/api/users', currentUser?.id, 'profile'],
    enabled: !!currentUser?.id,
  });

  const generateCVHTML = () => {
    const user = profile || currentUser;
    const skills = profile?.skills || [];
    const badges = profile?.badges || [];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: #1f2937;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #8B5CF6;
          }
          .name {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
          }
          .role {
            display: inline-block;
            background: linear-gradient(135deg, #8B5CF6, #EC4899);
            color: white;
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 14px;
            text-transform: capitalize;
          }
          .contact {
            margin-top: 12px;
            color: #6b7280;
            font-size: 14px;
          }
          .section {
            margin-bottom: 24px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #8B5CF6;
            margin-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
          }
          .bio {
            color: #4b5563;
            line-height: 1.6;
          }
          .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .skill {
            background: #f3f4f6;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            color: #374151;
          }
          .badges {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .badge {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #fef3c7;
            padding: 8px 16px;
            border-radius: 8px;
          }
          .stats {
            display: flex;
            justify-content: space-around;
            background: #f9fafb;
            padding: 20px;
            border-radius: 12px;
          }
          .stat {
            text-align: center;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #8B5CF6;
          }
          .stat-label {
            font-size: 12px;
            color: #6b7280;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="name">${user?.displayName || `${user?.firstName} ${user?.lastName}`}</div>
          <span class="role">${user?.role}</span>
          ${user?.university ? `<div class="contact">${user.university}</div>` : ''}
          <div class="contact">${user?.email}</div>
        </div>

        ${user?.bio ? `
        <div class="section">
          <div class="section-title">About</div>
          <p class="bio">${user.bio}</p>
        </div>
        ` : ''}

        ${skills.length > 0 ? `
        <div class="section">
          <div class="section-title">Skills</div>
          <div class="skills">
            ${skills.map(s => `<span class="skill">${s.skill.name}${s.endorsementCount > 0 ? ` (${s.endorsementCount} endorsements)` : ''}</span>`).join('')}
          </div>
        </div>
        ` : ''}

        ${badges.length > 0 ? `
        <div class="section">
          <div class="section-title">Achievements</div>
          <div class="badges">
            ${badges.map(b => `<div class="badge"><span>🏆</span> ${b.badge.name}</div>`).join('')}
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Platform Statistics</div>
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${user?.points || 0}</div>
              <div class="stat-label">Points</div>
            </div>
            <div class="stat">
              <div class="stat-value">${user?.challengePoints || 0}</div>
              <div class="stat-label">Challenge Points</div>
            </div>
            <div class="stat">
              <div class="stat-value">${user?.rankTier || 'Newcomer'}</div>
              <div class="stat-label">Rank</div>
            </div>
          </div>
        </div>

        <div class="footer">
          Generated from UniNexus - ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const html = generateCVHTML();
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
        });
      } else {
        Alert.alert('Success', 'CV exported successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export CV');
    } finally {
      setExporting(false);
    }
  };

  const user = profile || currentUser;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={colors.gradient.full}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export CV</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.previewCard}>
          <CardContent>
            <Text style={styles.previewTitle}>CV Preview</Text>
            
            <View style={styles.previewHeader}>
              <Text style={styles.previewName}>
                {user?.displayName || `${user?.firstName} ${user?.lastName}`}
              </Text>
              <Badge variant="primary">{user?.role}</Badge>
              {user?.university && (
                <Text style={styles.previewDetail}>{user.university}</Text>
              )}
              <Text style={styles.previewDetail}>{user?.email}</Text>
            </View>

            {user?.bio && (
              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.previewText}>{user.bio}</Text>
              </View>
            )}

            {profile?.skills && profile.skills.length > 0 && (
              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={styles.skillsContainer}>
                  {profile.skills.map(skill => (
                    <Badge key={skill.id} variant="outline">
                      {skill.skill.name}
                    </Badge>
                  ))}
                </View>
              </View>
            )}

            {profile?.badges && profile.badges.length > 0 && (
              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>Achievements</Text>
                <View style={styles.badgesContainer}>
                  {profile.badges.slice(0, 4).map(badge => (
                    <View key={badge.id} style={styles.badgeItem}>
                      <Ionicons name="trophy" size={16} color={colors.warning} />
                      <Text style={styles.badgeName}>{badge.badge.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{user?.points || 0}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{user?.challengePoints || 0}</Text>
                <Text style={styles.statLabel}>Challenge</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{user?.rankTier || 'New'}</Text>
                <Text style={styles.statLabel}>Rank</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        <Button
          title={exporting ? 'Exporting...' : 'Export as PDF'}
          onPress={handleExport}
          loading={exporting}
          icon={<Ionicons name="download" size={20} color={colors.textLight} />}
          style={styles.exportButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textLight,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  previewCard: {
    marginBottom: spacing.lg,
  },
  previewTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  previewHeader: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  previewName: {
    ...typography.h3,
    color: colors.text,
  },
  previewDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  previewSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  previewText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgesContainer: {
    gap: spacing.sm,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeName: {
    ...typography.bodySmall,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h4,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exportButton: {
    marginTop: spacing.md,
  },
});
