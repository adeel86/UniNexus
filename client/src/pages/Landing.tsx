import { GradientButton } from "@/components/GradientButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Users, Trophy, Zap, Building2, Briefcase } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Landing() {
  const { currentUser, userData } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (currentUser && userData) {
      navigate("/");
    }
  }, [currentUser, userData, navigate]);

  const roleInfo = [
    {
      role: "Student",
      description: "Access learning content, social features, and AI-powered career guidance.",
      icon: Users,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      role: "Teacher",
      description: "Mentor students, manage courses, and access deep learning analytics.",
      icon: Trophy,
      gradient: "from-blue-500 to-purple-500",
    },
    {
      role: "University",
      description: "Institutional oversight, retention metrics, and campus-wide insights.",
      icon: Building2,
      gradient: "from-pink-500 to-rose-500",
    },
    {
      role: "Industry",
      description: "Discover emerging talent, post real-world challenges, and share insights.",
      icon: Briefcase,
      gradient: "from-blue-600 to-indigo-600",
    },
    {
      role: "Admin",
      description: "Full platform control, user moderation, and system configuration.",
      icon: Zap,
      gradient: "from-purple-600 to-blue-600",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-blue-950 py-24 sm:py-32">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Gen Z Student Ecosystem</span>
              </div>
              
              <h1 className="font-heading text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                UniNexus: The Future of Learning
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl">
                The all-in-one ecosystem where students, educators, and industry leaders connect through AI, gamification, and meaningful networking.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <GradientButton
                  onClick={() => window.location.href = '/login'}
                  className="text-lg px-8 py-7 rounded-2xl shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
                  data-testid="button-get-started"
                >
                  Join the Community
                </GradientButton>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/login'}
                  className="text-lg px-8 py-7 rounded-2xl border-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
                  data-testid="button-login-secondary"
                >
                  Login
                </Button>
              </div>
            </div>

            <div className="flex-1 w-full max-w-2xl animate-in zoom-in duration-700">
              <div className="relative p-2 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden group">
                <img 
                  src="/assets/diverse_college_study.jpg" 
                  alt="Students studying together" 
                  className="w-full h-auto rounded-2xl object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Background decorations */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-purple-200/50 dark:bg-purple-900/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-200/50 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Role Information Section */}
      <div className="py-24 bg-gray-50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-4xl font-bold mb-4">Tailored for Every Stakeholder</h2>
            <p className="text-gray-600 dark:text-gray-400">Our platform bridges the gap between education and industry, providing unique tools for everyone in the ecosystem.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {roleInfo.map((role) => {
              const Icon = role.icon;
              return (
                <Card
                  key={role.role}
                  className="p-8 border-none shadow-lg hover:shadow-xl transition-all bg-white dark:bg-gray-800 flex flex-col items-center text-center group"
                  data-testid={`card-role-info-${role.role.toLowerCase()}`}
                >
                  <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="font-heading text-xl font-bold mb-4">
                    {role.role}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {role.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-gray-600 dark:text-gray-400">Experience a suite of cutting-edge tools designed to maximize engagement and growth.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "AI CareerBot", desc: "Get personalized career paths and mentorship based on your unique skills and goals.", icon: Sparkles },
              { title: "Gamification", desc: "Stay motivated with badges, experience points, and competitive leaderboards.", icon: Trophy },
              { title: "Social Feed", desc: "Build your professional brand and connect with peers in a vibrant community.", icon: Users },
              { title: "Analytics", desc: "Track progress with detailed insights into engagement and skill development.", icon: Zap },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-8 border-none shadow-md hover:shadow-lg transition-all bg-white dark:bg-gray-800 text-center">
                  <div className="h-14 w-14 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-6">
                    <Icon className="h-7 w-7 text-purple-600" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-8">Ready to transform your future?</h2>
          <GradientButton
            onClick={() => window.location.href = '/login'}
            className="bg-white text-white hover:bg-gray-100 px-10 py-8 rounded-2xl text-xl font-bold"
          >
            Get Started Now
          </GradientButton>
        </div>
      </div>
    </div>
  );
}
