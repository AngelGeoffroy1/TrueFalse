"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { quizApi } from "@/lib/api/quiz-api";
import { useAuth } from "@/lib/hooks/use-auth";

export default function JoinQuiz() {
  const [quizCode, setQuizCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, profile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation de base
    if (!quizCode.trim()) {
      setError("Veuillez entrer un code de quiz valide");
      return;
    }

    if (!name.trim()) {
      setError("Veuillez entrer votre nom");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Vérifier si la session existe et est active
      const session = await quizApi.getSessionByCode(quizCode);
      
      console.log("Session récupérée:", session);
      
      if (!session) {
        setError("Aucune session n'existe avec ce code");
        setIsLoading(false);
        return;
      }
      
      // Vérifier si la session a été trouvée mais est inactive
      if (session.is_inactive_warning) {
        setError("Cette session existe mais n'est pas active. L'enseignant doit d'abord démarrer la session.");
        setIsLoading(false);
        return;
      }
      
      if (!session.is_active) {
        setError("Cette session n'est pas active. L'enseignant doit d'abord démarrer la session.");
        setIsLoading(false);
        return;
      }
      
      try {
        // Ajouter le participant à la session
        const participant = await quizApi.addParticipant({
          session_id: session.id,
          // N'inclure student_id que s'il y a un utilisateur connecté
          ...(user?.id ? { student_id: user.id } : {}),
          name,
          connected: true,
          score: 0,
          cheat_attempts: 0,
          current_question: 0
        });
        
        // Rediriger vers la page du quiz
        router.push(`/quiz/${session.quiz_id}?participant=${participant.id}`);
      } catch (participantError: any) {
        console.error("Erreur lors de l'ajout du participant:", participantError);
        setError("Impossible de rejoindre la session: " + (participantError.message || "Erreur inconnue"));
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      setError(error.message || "Erreur lors de la connexion au quiz");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Rejoindre un Quiz</CardTitle>
          <CardDescription>
            Entrez le code fourni par votre enseignant et votre nom pour rejoindre le quiz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="code">Code du Quiz</Label>
              <Input 
                id="code" 
                placeholder="Exemple: QUIZ123" 
                className="text-center text-xl tracking-widest uppercase"
                maxLength={8}
                value={quizCode}
                onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Votre nom</Label>
              <Input 
                id="name" 
                placeholder="Prénom NOM" 
                value={name || (profile?.full_name || '')}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-2 rounded text-sm">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Connexion en cours..." : "Rejoindre le Quiz"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </CardFooter>
      </Card>
      
      <footer className="mt-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} TrueFalse - Application de Quiz Anti-Triche</p>
      </footer>
    </div>
  );
} 