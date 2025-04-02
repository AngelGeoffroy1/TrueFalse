"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { getSessionStatus } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { user, signIn, loading, error, setIsLoginPage } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Indiquer que nous sommes sur la page de login
  useEffect(() => {
    setIsLoginPage(true);
    return () => {
      setIsLoginPage(false);
    };
  }, [setIsLoginPage]);

  // Vérifier l'état de la session au chargement de la page
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { hasSession, user: sessionUser } = await getSessionStatus();
        
        if (hasSession && sessionUser) {
          console.log("Session existante détectée pour:", sessionUser.email);
          // Marquer la redirection pour le dashboard
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('login_redirected', 'true');
          }
          // Ajouter un délai pour éviter les problèmes de timing
          setTimeout(() => {
            router.push("/dashboard");
          }, 300);
        }
      } catch (err) {
        console.error("Erreur lors de la vérification de la session:", err);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkSession();
  }, [router]);

  // Effet séparé pour la redirection basée sur l'état useAuth
  useEffect(() => {
    // Si l'utilisateur est déjà connecté, rediriger vers le tableau de bord
    if (user && !isChecking) {
      console.log("Utilisateur déjà connecté via useAuth, redirection vers le tableau de bord");
      
      // Marquer la redirection pour le dashboard
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('login_redirected', 'true');
      }
      
      // Ajouter un délai pour éviter les problèmes de navigation
      setTimeout(() => {
        router.push("/dashboard");
      }, 300);
    }
  }, [user, router, isChecking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoggingIn || loading) return;
    
    try {
      setIsLoggingIn(true);
      // Appeler la fonction de connexion du hook useAuth
      await signIn(email, password);
      
      // Marquer la redirection pour le dashboard
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('login_redirected', 'true');
      }
      
      // Note: La redirection est gérée dans le hook useAuth
      // après une connexion réussie pour éviter les problèmes de timing
    } catch (err) {
      console.error("Erreur lors de la tentative de connexion:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Afficher un spinner pendant la vérification de session
  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="mt-4 text-slate-600">Vérification de votre connexion...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à votre espace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                placeholder="exemple@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoggingIn || loading}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Mot de passe</Label>
                <Link href="/reset-password" className="text-sm text-blue-600 hover:underline">
                  Mot de passe oublié?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password"
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn || loading}
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
              disabled={isLoggingIn || loading}
            >
              {isLoggingIn || loading ? (
                <div className="flex items-center justify-center">
                  <Spinner size="sm" className="mr-2" />
                  Connexion en cours...
                </div>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm text-slate-500 mt-2">
            Vous n'avez pas de compte? 
            <Link href="/register" className="text-blue-600 hover:underline ml-1">
              Créer un compte
            </Link>
          </div>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 