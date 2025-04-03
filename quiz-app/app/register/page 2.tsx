"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [isSuccess, setIsSuccess] = useState(false);
  const { user, signUp, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(email, password, fullName, role);
      // Si aucune erreur n'est levée, c'est un succès
      setIsSuccess(true);
      toast.success("Inscription réussie ! Un email de confirmation a été envoyé.", {
        duration: 5000,
        icon: <CheckCircle className="h-5 w-5 text-green-500 animate-bounce" />
      });
      
      // Rediriger vers la page de connexion après un court délai
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      // L'erreur est déjà gérée par le hook useAuth
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <CardDescription>
            Inscrivez-vous pour utiliser TrueFalse
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500 animate-bounce" />
              </div>
              <h3 className="text-xl font-medium text-green-700">Inscription réussie !</h3>
              <p className="text-gray-600">
                Un email de confirmation a été envoyé à {email}.<br/>
                Vous allez être redirigé vers la page de connexion...
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input 
                  id="fullName" 
                  placeholder="Jean Dupont" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="exemple@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input 
                  id="password" 
                  type="password"
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <p className="text-xs text-slate-500">
                  Le mot de passe doit contenir au moins 6 caractères.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Vous êtes</Label>
                <RadioGroup 
                  defaultValue="teacher" 
                  value={role}
                  onValueChange={(value) => setRole(value as "teacher" | "student")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="teacher" id="teacher" />
                    <Label htmlFor="teacher">Enseignant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="student" id="student" />
                    <Label htmlFor="student">Élève</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-2 rounded text-sm">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Création du compte..." : "S'inscrire"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm text-slate-500 mt-2">
            Vous avez déjà un compte? 
            <Link href="/login" className="text-blue-600 hover:underline ml-1">
              Se connecter
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