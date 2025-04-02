"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { LogOut, Save, User, Mail, Calendar, KeyRound, School, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { quizApi } from "@/lib/api/quiz-api";
import { supabase } from "@/lib/supabase/client";

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    school: ""
  });
  const [stats, setStats] = useState({
    quizCount: 0,
    sessionCount: 0,
    participantCount: 0,
    averageScore: "--"
  });
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (profile) {
      setFormData({
        fullName: profile.full_name || "",
        email: profile.email || "",
        school: profile.school || ""
      });
      fetchStats();
      setIsLoading(false);
    }
  }, [user, profile, loading, router]);

  const fetchStats = async () => {
    if (!user || !profile) return;
    
    try {
      // Récupérer les quiz de l'enseignant
      const quizzes = await quizApi.getTeacherQuizzes(user.id);
      
      // Récupérer les sessions actives
      const sessions = await quizApi.getActiveSessions(user.id);
      
      // Calculer le nombre total de participants
      let totalParticipants = 0;
      let totalScore = 0;
      let scoreCount = 0;
      
      if (sessions && sessions.length > 0) {
        await Promise.all(sessions.map(async (session) => {
          try {
            const participants = await quizApi.getSessionParticipants(session.id);
            totalParticipants += participants?.length || 0;
            
            // Calculer le score moyen si disponible
            participants?.forEach(participant => {
              if (participant.score !== null) {
                totalScore += participant.score;
                scoreCount++;
              }
            });
          } catch (error) {
            console.warn("Erreur lors de la récupération des participants:", error);
          }
        }));
      }
      
      setStats({
        quizCount: quizzes?.length || 0,
        sessionCount: sessions?.length || 0,
        participantCount: totalParticipants,
        averageScore: scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : "--"
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
      router.push('/');
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error("Utilisateur non connecté");
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Mettre à jour le profil dans Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          school: formData.school
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      toast.success("Profil mis à jour avec succès");
      setIsEditing(false);
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast.error("Erreur lors de la mise à jour du profil");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" asChild>
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Retour au tableau de bord
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Carte de profil */}
          <Card className="md:col-span-1">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="" alt={profile?.full_name} />
                  <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                    {profile?.full_name ? getInitials(profile.full_name) : "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle>{profile?.full_name}</CardTitle>
              <CardDescription>
                <Badge className="mt-2" variant={profile?.role === 'teacher' ? "default" : "secondary"}>
                  {profile?.role === 'teacher' ? 'Enseignant' : 'Étudiant'}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-slate-500 flex items-center justify-center gap-2 mb-2">
                <Mail size={14} />
                {profile?.email}
              </p>
              {profile?.school && (
                <p className="text-sm text-slate-500 flex items-center justify-center gap-2 mb-2">
                  <School size={14} />
                  {profile.school}
                </p>
              )}
              <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                <Calendar size={14} />
                Membre depuis {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : '--'}
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </CardFooter>
          </Card>

          {/* Informations détaillées */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Informations du profil</CardTitle>
              <CardDescription>
                Consultez et modifiez vos informations personnelles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">Informations</TabsTrigger>
                  <TabsTrigger value="security">Sécurité</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nom complet</Label>
                    <div className="flex">
                      <Input 
                        id="fullName" 
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        disabled={!isEditing}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={true} // L'email ne peut pas être modifié
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school">Établissement</Label>
                    <Input 
                      id="school" 
                      value={formData.school}
                      onChange={(e) => setFormData({...formData, school: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rôle</Label>
                    <Input 
                      id="role" 
                      value={profile?.role === 'teacher' ? 'Enseignant' : 'Étudiant'}
                      disabled
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Annuler
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={isSaving}>
                          <Save className="mr-2 h-4 w-4" />
                          {isSaving ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditing(true)}>
                        Modifier
                      </Button>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="security" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                    <Input id="currentPassword" type="password" disabled={!isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input id="newPassword" type="password" disabled={!isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input id="confirmPassword" type="password" disabled={!isEditing} />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Annuler
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={isSaving}>
                          <KeyRound className="mr-2 h-4 w-4" />
                          {isSaving ? "Mise à jour..." : "Mettre à jour"}
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditing(true)}>
                        Modifier
                      </Button>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
              <CardDescription>
                Votre activité sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">Quizzes créés</p>
                  <p className="text-2xl font-semibold">{stats.quizCount}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">Sessions actives</p>
                  <p className="text-2xl font-semibold">{stats.sessionCount}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">Participants</p>
                  <p className="text-2xl font-semibold">{stats.participantCount}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">Score moyen</p>
                  <p className="text-2xl font-semibold">{stats.averageScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
} 