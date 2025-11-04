import { GradientButton } from "@/components/GradientButton";
import { Card } from "@/components/ui/card";
import { Sparkles, Users, Trophy, Zap, Building2, Briefcase } from "lucide-react";

export default function Landing() {
  const demoAccounts = [
    {
      role: "Student",
      email: "demo.student@uninexus.app",
      description: "Experience the social feed, gamification, and AI CareerBot",
      icon: Users,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      role: "Teacher",
      email: "demo.teacher@uninexus.app",
      description: "Access student analytics and endorsement tools",
      icon: Trophy,
      gradient: "from-blue-500 to-purple-500",
    },
    {
      role: "University Admin",
      email: "demo.university@uninexus.app",
      description: "View retention metrics and institutional insights",
      icon: Building2,
      gradient: "from-pink-500 to-rose-500",
    },
    {
      role: "Industry Partner",
      email: "demo.industry@uninexus.app",
      description: "Discover talent and post challenges",
      icon: Briefcase,
      gradient: "from-blue-600 to-indigo-600",
    },
    {
      role: "Master Admin",
      email: "demo.admin@uninexus.app",
      description: "Full platform control and moderation",
      icon: Zap,
      gradient: "from-purple-600 to-blue-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-300/50 mb-6">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Gen Z Student Ecosystem</span>
          </div>
          
          <h1 className="font-heading text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            Welcome to UniNexus
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
            Connect, learn, and grow with AI-powered features, gamification, and a vibrant community of students, teachers, and industry partners.
          </p>

          <GradientButton
            onClick={() => window.location.href = '/api/login'}
            className="text-lg px-8 py-6 rounded-xl"
            data-testid="button-login"
          >
            Get Started
          </GradientButton>
        </div>

        {/* Demo Accounts Section */}
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl font-bold text-center mb-8">
            Try Demo Accounts
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demoAccounts.map((account) => {
              const Icon = account.icon;
              return (
                <Card
                  key={account.role}
                  className="p-6 hover-elevate active-elevate-2 cursor-pointer transition-all"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid={`card-demo-${account.role.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${account.gradient} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="font-heading text-xl font-semibold mb-2">
                    {account.role}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {account.description}
                  </p>
                  
                  <div className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2 rounded-lg">
                    {account.email}
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Click on any demo account card or the "Get Started" button to log in.
            <br />
            All demo accounts are pre-populated with sample data.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mt-16">
          {[
            { title: "AI CareerBot", desc: "Personalized career guidance", icon: Sparkles },
            { title: "Gamification", desc: "Badges, points & leaderboards", icon: Trophy },
            { title: "Social Feed", desc: "Connect with peers", icon: Users },
            { title: "Analytics", desc: "Track engagement & growth", icon: Zap },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
