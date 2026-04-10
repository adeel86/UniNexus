import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Bell, Lock, User, Shield, AlertTriangle, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Autocomplete, type AutocompleteOption } from "@/components/Autocomplete";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MobilePageHeader } from "@/components/MobilePageHeader";

export default function Settings() {
  const { userData, signOut, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Form states
  const [firstName, setFirstName] = useState(userData?.firstName || "");
  const [lastName, setLastName] = useState(userData?.lastName || "");
  const [email, setEmail] = useState(userData?.email || "");
  const [university, setUniversity] = useState<AutocompleteOption | null>(
    userData?.university ? { id: userData?.universityId || userData.university, name: userData.university } : null
  );
  const [major, setMajor] = useState<AutocompleteOption | null>(
    userData?.major ? { id: userData?.majorId || userData.major, name: userData.major } : null
  );
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Load user preferences
  const { data: userPreferences = null, isLoading: preferencesLoading } = useQuery<any>({
    queryKey: ["/api/users/preferences"],
    enabled: !!userData?.id,
  });

  // Initialize preference states from loaded data
  const [emailNotifications, setEmailNotifications] = useState(
    userPreferences?.emailNotifications ?? true
  );
  const [pushNotifications, setPushNotifications] = useState(
    userPreferences?.pushNotifications ?? true
  );
  const [commentNotifications, setCommentNotifications] = useState(
    userPreferences?.commentNotifications ?? true
  );
  const [endorsementNotifications, setEndorsementNotifications] = useState(
    userPreferences?.endorsementNotifications ?? true
  );
  const [publicProfile, setPublicProfile] = useState(
    userPreferences?.publicProfile ?? true
  );
  const [showEmail, setShowEmail] = useState(
    userPreferences?.showEmail ?? false
  );
  const [showActivity, setShowActivity] = useState(
    userPreferences?.showActivity ?? true
  );

  // Sync profile form fields when userData loads or changes (e.g. after refresh)
  useEffect(() => {
    if (userData) {
      setFirstName(userData.firstName || "");
      setLastName(userData.lastName || "");
      setEmail(userData.email || "");
      setUniversity(
        userData.university
          ? { id: userData.universityId || userData.university, name: userData.university }
          : null
      );
      setMajor(
        userData.major
          ? { id: userData.majorId || userData.major, name: userData.major }
          : null
      );
    }
  }, [userData?.id]);

  useEffect(() => {
    if (userPreferences) {
      setEmailNotifications(userPreferences.emailNotifications ?? true);
      setPushNotifications(userPreferences.pushNotifications ?? true);
      setCommentNotifications(userPreferences.commentNotifications ?? true);
      setEndorsementNotifications(userPreferences.endorsementNotifications ?? true);
      setPublicProfile(userPreferences.publicProfile ?? true);
      setShowEmail(userPreferences.showEmail ?? false);
      setShowActivity(userPreferences.showActivity ?? true);
    }
  }, [userPreferences]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Invalid confirmation",
        description: "Please type DELETE to confirm.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await apiRequest("DELETE", "/api/users/me");
      await signOut();
      toast({
        title: "Account deleted",
        description: "Your account has been permanently removed.",
      });
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "An error occurred while deleting your account.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName || !lastName) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      await apiRequest("PATCH", "/api/users/profile", {
        firstName,
        lastName,
        email,
        universityId: university?.id || null,
        majorId: major?.id || null,
      });

      await refreshUserData();

      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSavingPreferences(true);
    try {
      await apiRequest("PATCH", "/api/users/preferences/notifications", {
        emailNotifications,
        pushNotifications,
        commentNotifications,
        endorsementNotifications,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/users/preferences"] });

      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save notification preferences.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleSavePrivacy = async () => {
    setIsSavingPreferences(true);
    try {
      await apiRequest("PATCH", "/api/users/preferences/privacy", {
        publicProfile,
        showEmail,
        showActivity,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/users/preferences"] });

      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save privacy settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword) {
      toast({
        title: "Missing current password",
        description: "Please enter your current password.",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Invalid new password",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (response.ok) {
        toast({
          title: "Password changed",
          description: "Your password has been successfully updated.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password. Please check your current password and try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl pt-14 md:pt-6">
      <MobilePageHeader title="Settings" />
      <div className="mb-6 hidden md:block">
        <h1 className="font-heading text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" data-testid="tab-privacy">
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                />
              </div>

              {(userData?.role === 'student' || userData?.role === 'teacher' || userData?.role === 'university_admin') && (
                <div className="space-y-2">
                  <Label>University</Label>
                  <Autocomplete
                    placeholder="Search your university..."
                    value={university}
                    onChange={(option) => setUniversity(option)}
                    onCustomEntry={(text) => setUniversity({ id: text, name: text })}
                    searchEndpoint="/api/universities/search"
                    allowCustomEntry={true}
                    testId="autocomplete-university"
                  />
                </div>
              )}

              {(userData?.role === 'student' || userData?.role === 'teacher') && (
                <div className="space-y-2">
                  <Label>Major / Field of Study</Label>
                  <Autocomplete
                    placeholder="Search your major..."
                    value={major}
                    onChange={(option) => setMajor(option)}
                    onCustomEntry={(text) => setMajor({ id: text, name: text })}
                    searchEndpoint="/api/majors/search"
                    allowCustomEntry={true}
                    testId="autocomplete-major"
                  />
                </div>
              )}

              <Separator />

              <Button 
                onClick={handleSaveProfile} 
                disabled={isSavingProfile}
                data-testid="button-save-profile"
              >
                {isSavingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  data-testid="switch-email-notifications"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                  data-testid="switch-push-notifications"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="comment-notifications">Comment Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone comments on your posts
                  </p>
                </div>
                <Switch
                  id="comment-notifications"
                  checked={commentNotifications}
                  onCheckedChange={setCommentNotifications}
                  data-testid="switch-comment-notifications"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="endorsement-notifications">Endorsement Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone endorses your skills
                  </p>
                </div>
                <Switch
                  id="endorsement-notifications"
                  checked={endorsementNotifications}
                  onCheckedChange={setEndorsementNotifications}
                  data-testid="switch-endorsement-notifications"
                />
              </div>

              <Separator />

              <Button 
                onClick={handleSaveNotifications} 
                disabled={isSavingPreferences}
                data-testid="button-save-notifications"
              >
                {isSavingPreferences ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control who can see your information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="profile-visibility">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Make your profile visible to everyone
                  </p>
                </div>
                <Switch
                  id="profile-visibility"
                  checked={publicProfile}
                  onCheckedChange={setPublicProfile}
                  data-testid="switch-profile-visibility"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-email">Show Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your email address on your profile
                  </p>
                </div>
                <Switch
                  id="show-email"
                  checked={showEmail}
                  onCheckedChange={setShowEmail}
                  data-testid="switch-show-email"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-activity">Show Activity</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others see your recent activity
                  </p>
                </div>
                <Switch
                  id="show-activity"
                  checked={showActivity}
                  onCheckedChange={setShowActivity}
                  data-testid="switch-show-activity"
                />
              </div>

              <Separator />

              <Button 
                onClick={handleSavePrivacy} 
                disabled={isSavingPreferences}
                data-testid="button-save-privacy"
              >
                {isSavingPreferences ? "Saving..." : "Save Privacy Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input 
                  id="current-password" 
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  data-testid="input-current-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
              </div>

              <Separator />

              <Button 
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                data-testid="button-change-password"
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-semibold">Danger Zone</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2" data-testid="button-delete-account-trigger">
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove your data from our servers.
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="delete-confirm">Type <span className="font-bold">DELETE</span> to confirm:</Label>
                          <Input
                            id="delete-confirm"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="border-destructive focus-visible:ring-destructive"
                            data-testid="input-delete-confirm"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE" || isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        {isDeleting ? "Deleting..." : "Delete Permanently"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
