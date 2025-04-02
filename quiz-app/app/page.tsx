"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// Composant client uniquement pour les points scintillants
interface PointProps {
  count: number;
  sectionId: string;
}

interface PointData {
  id: number;
  size: number;
  top: number;
  left: number;
  delay: number;
  duration: number;
  repeatDelay: number;
}

const ShiningPoints = ({ count, sectionId }: PointProps) => {
  const [points, setPoints] = useState<PointData[]>([]);
  
  useEffect(() => {
    // Générer les points uniquement côté client
    const newPoints = Array.from({ length: count }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      repeatDelay: Math.random() * 5
    }));
    
    setPoints(newPoints);
  }, [count]);
  
  return (
    <>
      {points.map((point) => (
        <motion.div
          key={`${sectionId}-point-${point.id}`}
          className="absolute bg-white rounded-full z-10"
          style={{ 
            width: point.size, 
            height: point.size, 
            top: `${point.top}%`, 
            left: `${point.left}%` 
          }}
          animate={{ 
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: point.duration,
            repeat: Infinity,
            delay: point.delay,
            repeatDelay: point.repeatDelay
          }}
        />
      ))}
    </>
  );
};

// Composant client uniquement pour les étoiles clignotantes
interface StarProps {
  count: number;
}

interface StarData {
  id: number;
  size: number;
  top: number;
  left: number;
  delay: number;
  duration: number;
}

const BlinkingStars = ({ count }: StarProps) => {
  const [stars, setStars] = useState<StarData[]>([]);
  
  useEffect(() => {
    // Générer les étoiles uniquement côté client
    const newStars = Array.from({ length: count }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 3
    }));
    
    setStars(newStars);
  }, [count]);
  
  return (
    <>
      {stars.map((star) => (
        <motion.div
          key={`star-${star.id}`}
          className="absolute bg-white rounded-full z-10"
          style={{ 
            width: star.size, 
            height: star.size, 
            top: `${star.top}%`, 
            left: `${star.left}%` 
          }}
          animate={{ 
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.5, 1]
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      ))}
    </>
  );
};

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [showHeader, setShowHeader] = useState(true);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const lastScrollY = useRef(0);
  
  useEffect(() => {
    setLoaded(true);
    
    // Ajouter le comportement de défilement fluide au document
    document.documentElement.style.scrollBehavior = 'smooth';
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Déterminer si on montre ou cache le header selon la direction du scroll
      if (currentScrollY > lastScrollY.current) {
        // Scroll vers le bas - cacher le header
        setShowHeader(false);
      } else {
        // Scroll vers le haut - montrer le header
        setShowHeader(true);
      }
      
      lastScrollY.current = currentScrollY;
      
      // Mise à jour de la section active
      const sections = document.querySelectorAll('section, main');
      
      sections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop < window.innerHeight / 3) {
          setActiveSection(section.id);
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Réinitialiser le comportement de défilement
      document.documentElement.style.scrollBehavior = 'auto';
    }
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.6 } }
  };

  return (
    <div className="relative min-h-screen">
      {/* Cercles décoratifs pour les autres sections, pas pour le hero */}
      <div className="absolute top-[100vh] left-[10%] w-72 h-72 rounded-full bg-purple-500/5 blur-3xl"></div>
      <div className="absolute top-[120vh] right-[5%] w-96 h-96 rounded-full bg-blue-500/5 blur-3xl"></div>
      <div className="absolute top-[130vh] left-[30%] w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl"></div>

      {/* Header fixe avec navigation */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ 
          y: showHeader ? 0 : -100, 
          opacity: showHeader ? 1 : 0 
        }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 py-4 backdrop-blur-sm bg-white/5"
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center">
            <div className="flex items-center gap-2 flex-none">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-blue-600">TrueFalse</h1>
            </div>
            
            <nav className="hidden md:flex justify-center flex-1 items-center">
              {[
                { id: "hero", label: "Accueil" },
                { id: "anti-triche", label: "Sécurité" },
                { id: "features", label: "Fonctionnalités" },
                { id: "pricing", label: "Tarifs" }
              ].map(item => (
                <a 
                  key={item.id}
                  href={`#${item.id}`}
                  className={`text-sm font-medium transition-colors hover:text-blue-600 relative py-1 px-4 ${activeSection === item.id ? 'text-blue-600' : 'text-slate-700'}`}
                >
                  {item.label}
                  {activeSection === item.id && (
                    <motion.span 
                      layoutId="activeSection"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    />
                  )}
                </a>
              ))}
            </nav>
            
            <div className="flex gap-4 flex-none">
              <Button variant="ghost" asChild size="sm">
                <Link href="/login" className="text-sm">Connexion</Link>
              </Button>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Link href="/register" className="text-sm">Créer un compte</Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero section */}
      <main id="hero" className="container mx-auto px-6 flex flex-col md:flex-row items-center mt-32 md:mt-40 pb-24">
        <motion.div 
          variants={container}
          initial="hidden"
          animate={loaded ? "show" : "hidden"}
          className="flex-1"
        >
          <motion.h2 
            variants={item} 
            className="text-4xl md:text-6xl font-bold text-slate-800"
          >
            Évaluez vos élèves de façon<br/>
            <span className="text-blue-600">interactive</span> et <span className="text-purple-600">dynamique</span>
          </motion.h2>
          
          <motion.p 
            variants={item}
            className="mt-6 text-lg text-slate-600 max-w-xl"
          >
            TrueFalse est une plateforme d'évaluation en temps réel qui permet aux enseignants de créer des quiz interactifs et d'obtenir des résultats instantanés.
          </motion.p>
          
          <motion.div 
            variants={item}
            className="mt-8 flex flex-col sm:flex-row gap-4"
          >
            <Button 
              size="default" 
              asChild 
              className="shadow-lg shadow-blue-500/20 text-base px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Link href="/dashboard">Commencer maintenant</Link>
            </Button>
            
            <Button 
              variant="outline" 
              size="default" 
              asChild 
              className="text-base px-6 py-2"
            >
              <Link href="/quiz/join">Rejoindre un quiz</Link>
            </Button>
          </motion.div>
          
          <motion.div 
            variants={item}
            className="mt-8 flex items-center gap-2"
          >
            <div className="flex -space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-medium text-blue-600">JD</div>
              <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-medium text-purple-600">ML</div>
              <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-medium text-indigo-600">PF</div>
              <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">+</div>
            </div>
            <p className="text-slate-600">Rejoint par plus de 3000 enseignants</p>
          </motion.div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="flex-1 relative mt-12 md:mt-0 md:pl-8 lg:pl-12"
        >
          <div className="relative ml-4 md:ml-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur-2xl opacity-20 transform -rotate-6"></div>
            <div className="relative bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Sciences - Le système solaire</h3>
                  <p className="text-slate-500">Question 2/10</p>
                </div>
                <div className="bg-blue-50 text-blue-600 font-medium px-4 py-1 rounded-full text-sm">
                  00:30
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-4">Quelle est la plus grande planète du système solaire?</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="border p-3 rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    <span className="font-medium mr-2">A.</span>Mars
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="border p-3 rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    <span className="font-medium mr-2">B.</span>Saturne
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="border p-3 rounded-lg cursor-pointer hover:bg-slate-50 bg-blue-50 border-blue-200"
                  >
                    <span className="font-medium mr-2">C.</span>Jupiter
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="border p-3 rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    <span className="font-medium mr-2">D.</span>Neptune
                  </motion.div>
                </div>
              </div>

              <div className="flex justify-between">
                <div className="bg-indigo-50 text-indigo-600 font-medium px-4 py-2 rounded-md text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                  28 réponses
                </div>
                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    className="bg-slate-100 text-slate-700 px-4 py-2 rounded-md flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7"></path>
                    </svg>
                    Précédent
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1"
                  >
                    Suivant
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"></path>
                    </svg>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Section anti-triche */}
      <section id="anti-triche" className="py-16 bg-gradient-to-b from-white via-slate-50/70 to-slate-50 relative overflow-hidden">
        {/* Éléments décoratifs */}
        <div className="absolute w-full h-full top-0 left-0 overflow-hidden z-0">
          <motion.div 
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ 
              duration: 25, 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
            className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full border-[40px] border-red-600/10"
          />
          <motion.div 
            animate={{ 
              rotate: [0, -360],
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
            className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full border-[30px] border-red-600/10"
          />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-10">
            {/* Maquette à gauche */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur-xl opacity-20 transform rotate-3"></div>
                <div className="relative bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="text-sm text-slate-500 ml-2">Surveillance du quiz</div>
                    </div>
                    <div className="text-sm font-medium text-red-600 flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <motion.span 
                          className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      En direct
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-4">Surveillance active - Mathématiques 101</h4>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-4">
                      <div className="text-sm text-slate-700 mb-3">Aperçu de la classe</div>
                      <div className="grid grid-cols-4 gap-2">
                        {Array(8).fill(0).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0.6, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.1 }}
                            className="rounded bg-white p-2 border border-slate-200 text-center"
                          >
                            <div className="w-6 h-6 mx-auto mb-1 bg-slate-200 rounded-full flex items-center justify-center text-xs">
                              {String.fromCharCode(65 + i)}
                            </div>
                            <div className="text-xs font-medium text-slate-700">
                              {i % 4 === 0 && (
                                <motion.div 
                                  className="inline-flex items-center gap-1 text-red-600"
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ duration: 0.6, repeat: Infinity }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                  </svg>
                                  Alerte
                                </motion.div>
                              ) || "Normal"}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-medium">A</div>
                          <div>
                            <div className="font-medium text-slate-800">Marie L.</div>
                            <div className="text-xs text-red-600">Changements d'onglets multiples</div>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-red-600">09:45</div>
                      </motion.div>
                      
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="flex justify-between items-center p-3 bg-orange-50 border border-orange-100 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium">E</div>
                          <div>
                            <div className="font-medium text-slate-800">Lucas K.</div>
                            <div className="text-xs text-orange-600">Temps de réponse anormal</div>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-orange-600">09:42</div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <div className="text-slate-500">Alertes: <span className="font-medium text-red-600">2</span></div>
                    <div className="text-slate-500">En cours: <span className="font-medium text-green-600">15/20</span></div>
                    <div className="text-slate-500">Durée: <span className="font-medium">00:12:47</span></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Texte à droite */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="flex-1"
            >
              <div className="inline-block mb-4 bg-red-50 text-red-600 px-4 py-1 rounded-full font-medium text-sm border border-red-100">
                Sécurité renforcée
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
                Système anti-triche <span className="text-red-600">avancé</span>
              </h2>
              <p className="text-slate-600 text-lg mb-6">
                Notre technologie protège l'intégrité de vos évaluations en détectant automatiquement les comportements suspects et en sécurisant l'environnement de test.
              </p>
              
              <div className="space-y-4">
                {[
                  {
                    title: "Détection des changements d'onglet",
                    desc: "Alerte lorsqu'un étudiant quitte la page du quiz",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                      </svg>
                    )
                  },
                  {
                    title: "Analyse des temps de réponse",
                    desc: "Identifie les motifs suspicieux dans la vitesse de réponse",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    )
                  },
                  {
                    title: "Prévention du copier-coller",
                    desc: "Empêche la copie des questions et l'importation de réponses",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    )
                  }
                ].map((feature, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-1 w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{feature.title}</h3>
                      <p className="text-slate-600">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Caractéristiques */}
      <section id="features" className="py-20 bg-gradient-to-b from-slate-50/80 via-white to-white relative overflow-hidden">
        {/* Éléments décoratifs */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-[5%] w-64 h-64 rounded-full bg-blue-500/5 blur-2xl"></div>
          <div className="absolute bottom-10 right-[10%] w-80 h-80 rounded-full bg-purple-500/5 blur-2xl"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="relative inline-block mx-auto">
              <h2 className="text-4xl font-bold text-slate-800 mb-3 text-center">
                Conçu pour les <span className="text-blue-600">enseignants modernes</span>
              </h2>
              <motion.span 
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
                className="absolute bottom-0 left-0 h-[6px] bg-blue-500/20 rounded-full"
              />
            </div>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg">
              Notre plateforme offre tout ce dont vous avez besoin pour créer, gérer et analyser vos évaluations
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                title: "Création facile",
                description: "Créez des quiz en quelques minutes avec notre interface intuitive et notre bibliothèque de questions",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                ),
                color: "blue"
              },
              {
                title: "Résultats en temps réel",
                description: "Visualisez les réponses de vos élèves instantanément pendant le quiz et adaptez votre enseignement",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                ),
                color: "purple"
              },
              {
                title: "Système anti-triche",
                description: "Détection automatique des comportements suspects et sécurisation des évaluations à distance",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                ),
                color: "red"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group relative"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${
                  feature.color === "blue" ? "from-blue-600 to-indigo-600" :
                  feature.color === "purple" ? "from-purple-600 to-pink-600" :
                  "from-red-600 to-orange-600"
                } opacity-0 blur-xl group-hover:opacity-30 transition-opacity duration-500`}></div>
                
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 relative flex flex-col h-full transition-all duration-300 group-hover:shadow-2xl group-hover:border-transparent overflow-hidden">
                  <div className={`absolute inset-0 ${
                    feature.color === "blue" ? "bg-blue-600" :
                    feature.color === "purple" ? "bg-purple-600" :
                    "bg-red-600"
                  } opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}></div>
                  
                  <div className="relative z-10">
                    <div className={`w-16 h-16 rounded-xl mb-6 flex items-center justify-center ${
                      feature.color === "blue" ? "bg-blue-100 text-blue-600" :
                      feature.color === "purple" ? "bg-purple-100 text-purple-600" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {feature.icon}
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-slate-900">{feature.title}</h3>
                    <p className="text-slate-600 group-hover:text-slate-700">{feature.description}</p>
                    
                    <div className={`mt-6 flex items-center text-sm font-medium ${
                      feature.color === "blue" ? "text-blue-600" :
                      feature.color === "purple" ? "text-purple-600" :
                      "text-red-600"
                    } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                      En savoir plus
                      <svg className="ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  
                  <motion.div 
                    className={`absolute bottom-0 left-0 right-0 h-1 ${
                      feature.color === "blue" ? "bg-blue-600" :
                      feature.color === "purple" ? "bg-purple-600" :
                      "bg-red-600"
                    }`}
                    initial={{ width: 0 }}
                    whileInView={{ width: "60%" }}
                    transition={{ duration: 0.6, delay: 0.6 + index * 0.2 }}
                    viewport={{ once: true }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Ajout de la maquette des rapports */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="mt-20 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="border-b border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="text-slate-500 text-sm ml-2">Rapport d'analyse - TrueFalse</div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Biologie - Chapitre 3</h3>
                  <p className="text-slate-500">25 participants • 15 questions • Terminé il y a 2h</p>
                </div>
                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-sm font-medium"
                  >
                    Exporter PDF
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-sm font-medium"
                  >
                    Partager
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <div className="text-green-600 font-medium">Taux de réussite</div>
                  <div className="text-3xl font-bold text-green-700 mt-2">76%</div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="text-blue-600 font-medium">Temps moyen</div>
                  <div className="text-3xl font-bold text-blue-700 mt-2">12m 35s</div>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                  <div className="text-purple-600 font-medium">Score moyen</div>
                  <div className="text-3xl font-bold text-purple-700 mt-2">14.2/20</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-slate-700 mb-3">Distribution des scores</h4>
                <div className="h-20 flex items-end gap-1">
                  {[15, 25, 20, 35, 45, 60, 75, 65, 40, 30, 20, 10].map((height, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="flex-1 bg-blue-500 rounded-t-sm"
                    ></motion.div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>0-2</span>
                  <span>2-4</span>
                  <span>4-6</span>
                  <span>6-8</span>
                  <span>8-10</span>
                  <span>10-12</span>
                  <span>12-14</span>
                  <span>14-16</span>
                  <span>16-18</span>
                  <span>18-20</span>
                </div>
              </div>

              <h4 className="font-medium text-slate-700 mb-3">Questions difficiles</h4>
              <div className="space-y-2">
                {[
                  { id: 'Q7', title: 'Structure de l\'ADN', success: '32%' },
                  { id: 'Q4', title: 'Photosynthèse', success: '41%' },
                  { id: 'Q12', title: 'Mitochondrie', success: '45%' }
                ].map((q, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-100 text-red-700 rounded-md flex items-center justify-center font-medium text-sm">
                        {q.id}
                      </div>
                      <span className="text-slate-700">{q.title}</span>
                    </div>
                    <div className="text-red-600 font-medium">{q.success}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to action */}
      <section id="cta" className="py-14 bg-gradient-to-r from-blue-600 to-indigo-700 text-white relative overflow-hidden">
        {/* Effet de vague animée */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-x-40 -bottom-40">
            <motion.svg 
              width="2000" 
              height="400" 
              viewBox="0 0 2000 400" 
              xmlns="http://www.w3.org/2000/svg"
              initial={{ y: 50, opacity: 0.3 }}
              animate={{ 
                y: [0, 10, 0],
                opacity: [0.2, 0.3, 0.2]
              }}
              transition={{ 
                duration: 10, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.path 
                d="M0,192 C220,100 440,100 660,192 C880,290 1100,290 1320,192 C1540,100 1760,100 1980,192 L1980,400 L0,400 Z" 
                fill="rgba(255,255,255,0.1)"
                animate={{ 
                  d: [
                    "M0,192 C220,100 440,100 660,192 C880,290 1100,290 1320,192 C1540,100 1760,100 1980,192 L1980,400 L0,400 Z",
                    "M0,150 C220,220 440,220 660,150 C880,90 1100,90 1320,150 C1540,220 1760,220 1980,150 L1980,400 L0,400 Z",
                    "M0,192 C220,100 440,100 660,192 C880,290 1100,290 1320,192 C1540,100 1760,100 1980,192 L1980,400 L0,400 Z"
                  ]
                }}
                transition={{ 
                  duration: 15, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.svg>
          </div>
          <div className="absolute -inset-x-40 -bottom-32">
            <motion.svg 
              width="2000" 
              height="400" 
              viewBox="0 0 2000 400" 
              xmlns="http://www.w3.org/2000/svg"
              initial={{ y: 60, opacity: 0.3 }}
              animate={{ 
                y: [0, 15, 0],
                opacity: [0.2, 0.25, 0.2]
              }}
              transition={{ 
                duration: 7, 
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            >
              <motion.path 
                d="M0,192 C220,100 440,100 660,192 C880,290 1100,290 1320,192 C1540,100 1760,100 1980,192 L1980,400 L0,400 Z" 
                fill="rgba(255,255,255,0.05)"
                animate={{ 
                  d: [
                    "M0,192 C220,100 440,100 660,192 C880,290 1100,290 1320,192 C1540,100 1760,100 1980,192 L1980,400 L0,400 Z",
                    "M0,200 C220,150 440,150 660,200 C880,250 1100,250 1320,200 C1540,150 1760,150 1980,200 L1980,400 L0,400 Z",
                    "M0,192 C220,100 440,100 660,192 C880,290 1100,290 1320,192 C1540,100 1760,100 1980,192 L1980,400 L0,400 Z"
                  ]
                }}
                transition={{ 
                  duration: 10, 
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              />
            </motion.svg>
          </div>
        </div>
        
        {/* Étoiles clignotantes animées - remplacées par le composant client */}
        {loaded && <BlinkingStars count={12} />}

        {/* Quadrillage design */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: i * 0.1 }}
              className="absolute border-t border-white"
              style={{ top: `${i * 10}%`, left: 0, right: 0 }}
            ></motion.div>
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: i * 0.1 }}
              className="absolute border-l border-white"
              style={{ left: `${i * 10}%`, top: 0, bottom: 0 }}
            ></motion.div>
          ))}
        </div>
        
        {/* Points lumineux animés */}
        {[
          { top: '20%', left: '10%', delay: 0 },
          { top: '70%', left: '15%', delay: 0.5 },
          { top: '40%', left: '88%', delay: 1 },
          { top: '85%', left: '75%', delay: 1.5 },
          { top: '15%', left: '60%', delay: 2 },
          { top: '60%', left: '40%', delay: 2.5 }
        ].map((point, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full"
            style={{ top: point.top, left: point.left }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 1],
              opacity: [0, 1, 0.6]
            }}
            transition={{
              duration: 3,
              delay: point.delay,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        ))}

        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <motion.h2 
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-6 relative inline-block"
            >
              Prêt à améliorer vos évaluations?
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-1 bg-white/30 rounded-full"
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                transition={{ duration: 1, delay: 0.5 }}
                viewport={{ once: true }}
              />
            </motion.h2>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto mb-8 text-blue-100"
            >
              Rejoignez les milliers d'enseignants qui utilisent TrueFalse pour dynamiser leurs cours et obtenir des résultats précis.
            </motion.p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                { title: 'Simple', desc: 'Configuration rapide en moins de 2 minutes', icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 16V9h14V2H5v7"></path>
                    <path d="M19 9v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9"></path>
                    <path d="M12 9v9"></path>
                    <path d="M8 13h8"></path>
                  </svg>
                ) },
                { title: 'Gratuit', desc: 'Commencez sans carte de crédit', icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20"></path>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                ) },
                { title: 'Complet', desc: 'Toutes les fonctionnalités dont vous avez besoin', icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="16 12 12 8 8 12"></polyline>
                    <line x1="12" y1="16" x2="12" y2="8"></line>
                  </svg>
                ) }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + (i * 0.15) }}
                  viewport={{ once: true }}
                  whileHover={{ 
                    y: -5,
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                    background: "rgba(255, 255, 255, 0.15)"
                  }}
                  className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 transition-all duration-300 flex flex-col items-center"
                >
                  <motion.div 
                    className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.8 }}
                  >
                    {item.icon}
                  </motion.div>
                  <h3 className="font-bold text-xl mb-2">{item.title}</h3>
                  <p className="text-blue-100 text-sm">{item.desc}</p>
                  <motion.div 
                    className="w-0 h-0.5 bg-white mt-3"
                    whileHover={{ width: "80%" }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
              ))}
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 0 30px rgba(255, 255, 255, 0.3)" 
              }}
              whileTap={{ scale: 0.95 }}
              className="relative inline-block group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg blur-lg opacity-40 group-hover:opacity-70 transition duration-1000"></div>
              <Button 
                size="lg" 
                variant="secondary" 
                asChild 
                className="relative px-8 py-6 text-lg font-semibold shadow-lg z-10 overflow-hidden"
              >
                <Link href="/dashboard" className="flex items-center gap-2">
                  <span>Commencer gratuitement</span>
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"></path>
                    </svg>
                  </motion.span>
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section Tarifs */}
      <section id="pricing" className="py-14 bg-gradient-to-b from-indigo-900 via-blue-900 to-slate-900 relative overflow-hidden">
        {/* Éléments décoratifs en arrière-plan */}
        <div className="absolute inset-0 w-full h-full">
          <div aria-hidden="true" className="absolute inset-0 w-full h-full bg-slate-900 bg-opacity-30 backdrop-blur-sm"></div>
          
          {/* Cercles lumineux avec animations */}
          <motion.div 
            className="absolute top-1/4 left-10 w-72 h-72 rounded-full bg-blue-500 opacity-10 blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              opacity: [0.1, 0.15, 0.1],
            }}
            transition={{ 
              duration: 15, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
          />
          <motion.div 
            className="absolute bottom-1/3 right-10 w-80 h-80 rounded-full bg-purple-500 opacity-10 blur-3xl"
            animate={{ 
              scale: [1, 1.3, 1],
              y: [0, -30, 0],
              opacity: [0.1, 0.15, 0.1],
            }}
            transition={{ 
              duration: 18, 
              repeat: Infinity, 
              repeatType: "reverse",
              delay: 2 
            }}
          />
          <motion.div 
            className="absolute top-2/3 left-1/3 w-64 h-64 rounded-full bg-cyan-500 opacity-10 blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, -40, 0],
              opacity: [0.1, 0.15, 0.1],
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              repeatType: "reverse",
              delay: 1 
            }}
          />
        </div>
        
        {/* Points scintillants - remplacés par le composant client */}
        {loaded && <ShiningPoints count={20} sectionId="pricing" />}
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center justify-center mb-4">
              <motion.span 
                initial={{ width: 0 }}
                whileInView={{ width: 40 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
                className="h-1 bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full"
              />
              <span className="px-3 text-blue-300 font-medium text-sm">Plans & Tarifs</span>
              <motion.span 
                initial={{ width: 0 }}
                whileInView={{ width: 40 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
                className="h-1 bg-gradient-to-r from-cyan-300 to-blue-400 rounded-full"
              />
            </div>
            
            <h2 className="text-4xl font-bold mb-4 text-white">Des forfaits pour tous les <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">besoins</span></h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto opacity-80">
              Choisissez le plan qui vous convient, commencez gratuitement et évoluez avec votre utilisation
            </p>
          </motion.div>
          
          <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
            {/* Plan 1: Gratuit */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              className="w-full md:w-80 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="px-8 py-10 relative z-10">
                <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">Découverte</h3>
                <p className="text-blue-200 mb-6">Parfait pour découvrir la plateforme</p>
                
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-white mr-2">0€</span>
                  <span className="text-blue-300">/mois</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {['5 quiz actifs', '30 étudiants par classe', 'Résultats en temps réel', 'Détection anti-triche basique'].map((feature, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (i * 0.1) }}
                      viewport={{ once: true }}
                      className="flex items-center text-blue-100"
                    >
                      <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      {feature}
                    </motion.li>
                  ))}
                </ul>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-3 rounded-lg border border-blue-400 text-blue-400 font-medium transition-all duration-300 hover:bg-blue-400 hover:text-slate-900"
                >
                  Commencer gratuitement
                </motion.button>
              </div>
            </motion.div>
            
            {/* Plan 2: Pro */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              className="w-full md:w-80 bg-gradient-to-b from-blue-900 to-blue-950 rounded-2xl overflow-hidden border border-blue-700 shadow-xl relative group transform scale-105 z-20"
            >
              <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="absolute -top-5 right-5">
                <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                  Populaire
                </div>
              </div>
              
              <div className="px-8 py-10 relative z-10">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                  </svg>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">Professionnel</h3>
                <p className="text-blue-200 mb-6">Idéal pour les enseignants avancés</p>
                
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-white mr-2">19,99€</span>
                  <span className="text-blue-300">/mois</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    '50 quiz actifs', 
                    'Classes illimitées', 
                    'Analyse détaillée des résultats', 
                    'Détection anti-triche avancée',
                    'Exporter les données (PDF, Excel)',
                    'Support prioritaire'
                  ].map((feature, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (i * 0.1) }}
                      viewport={{ once: true }}
                      className="flex items-center text-blue-100"
                    >
                      <svg className="w-5 h-5 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      {feature}
                    </motion.li>
                  ))}
                </ul>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium transition-all duration-300 shadow-lg shadow-blue-500/30"
                >
                  Choisir ce plan
                </motion.button>
              </div>
            </motion.div>
            
            {/* Plan 3: Entreprise */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              className="w-full md:w-80 bg-gradient-to-b from-purple-900 to-purple-950 rounded-2xl overflow-hidden border border-purple-700 shadow-xl relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="px-8 py-10 relative z-10">
                <div className="bg-purple-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">Établissement</h3>
                <p className="text-purple-200 mb-6">Pour les écoles et universités</p>
                
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-white mr-2">49,99€</span>
                  <span className="text-purple-300">/mois</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    'Quiz illimités', 
                    'Gestion multi-enseignants', 
                    'Intégration LMS/ENT', 
                    'Système anti-triche complet',
                    'Rapports personnalisés',
                    'API dédiée',
                    'Support dédié 24/7'
                  ].map((feature, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (i * 0.1) }}
                      viewport={{ once: true }}
                      className="flex items-center text-purple-100"
                    >
                      <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      {feature}
                    </motion.li>
                  ))}
                </ul>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium transition-all duration-300 shadow-lg shadow-purple-500/30"
                >
                  Contacter les ventes
                </motion.button>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="mt-16 max-w-3xl mx-auto text-center"
          >
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-xl">
              <h3 className="text-xl text-white font-semibold mb-3">Besoin d'un plan sur mesure ?</h3>
              <p className="text-blue-200 mb-4">Contactez notre équipe pour une solution adaptée à vos besoins spécifiques</p>
              <motion.button 
                onClick={() => setShowQuoteForm(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 rounded-lg border border-blue-400 text-blue-400 font-medium transition-all duration-300 hover:bg-blue-400 hover:text-slate-900"
              >
                Demander un devis
              </motion.button>
            </div>
          </motion.div>
          
          {/* Supprimer la liste des écoles */}
        </div>
      </section>

      {/* Formulaire de demande de devis */}
      <AnimatePresence>
        {showQuoteForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQuoteForm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                <h3 className="text-xl font-semibold">Demande de devis personnalisé</h3>
                <p className="text-blue-100 text-sm">Parlez-nous de vos besoins spécifiques</p>
              </div>
              
              <form className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Établissement</label>
                  <input 
                    type="text" 
                    placeholder="Nom de votre établissement" 
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom complet</label>
                  <input 
                    type="text" 
                    placeholder="Votre nom et prénom" 
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email professionnel</label>
                  <input 
                    type="email" 
                    placeholder="votre@email.com" 
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Téléphone</label>
                  <input 
                    type="tel" 
                    placeholder="+33 6 xx xx xx xx" 
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre d'utilisateurs estimé</label>
                  <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>1-10 utilisateurs</option>
                    <option>11-50 utilisateurs</option>
                    <option>51-200 utilisateurs</option>
                    <option>201-500 utilisateurs</option>
                    <option>Plus de 500 utilisateurs</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                  <textarea 
                    rows={4}
                    placeholder="Décrivez vos besoins spécifiques..." 
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>
                
                <div className="flex items-center pt-2">
                  <motion.button 
                    type="submit"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-md shadow-md"
                  >
                    Envoyer ma demande
                  </motion.button>
                  <motion.button 
                    type="button"
                    onClick={() => setShowQuoteForm(false)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="ml-3 py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-md"
                  >
                    Annuler
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div className="mb-8 md:mb-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-600 text-white p-1.5 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">TrueFalse</span>
              </div>
              <p className="max-w-xs">
                Plateforme d'évaluation interactive pour les enseignants modernes.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-white font-semibold mb-4">Produit</h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="hover:text-white transition">Fonctionnalités</Link></li>
                  <li><Link href="#" className="hover:text-white transition">Tarifs</Link></li>
                  <li><Link href="#" className="hover:text-white transition">FAQ</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-white font-semibold mb-4">Entreprise</h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="hover:text-white transition">À propos</Link></li>
                  <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
                  <li><Link href="#" className="hover:text-white transition">Nous contacter</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-white font-semibold mb-4">Légal</h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="hover:text-white transition">Confidentialité</Link></li>
                  <li><Link href="#" className="hover:text-white transition">Conditions</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
            <p>© 2024 TrueFalse. Tous droits réservés.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <Link href="#" className="hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </Link>
              <Link href="#" className="hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                </svg>
              </Link>
              <Link href="#" className="hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
