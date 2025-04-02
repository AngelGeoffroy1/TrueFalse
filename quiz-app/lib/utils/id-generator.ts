/**
 * Génère un identifiant unique basé sur le timestamp et une valeur aléatoire
 * @returns Un identifiant unique sous forme de chaîne
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
}

/**
 * Génère un code de session court et lisible pour les élèves
 * @param length Longueur du code (défaut: 6)
 * @returns Un code de session en majuscules sans caractères ambigus
 */
export function generateSessionCode(length: number = 6): string {
  // Caractères sans ambiguïté (pas de O/0, I/1, etc.)
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Génère une chaîne aléatoire
 * @param length Longueur de la chaîne (défaut: 8)
 * @returns Une chaîne aléatoire
 */
export function generateRandomString(length: number = 8): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Formate un ID pour affichage
 * @param id Identifiant à formater
 * @param showFull Afficher l'ID en entier ou seulement une partie
 * @returns L'ID formaté
 */
export function formatId(id: string, showFull: boolean = false): string {
  if (showFull) {
    return id;
  }
  
  // Si l'ID contient un tiret, ne montrer que la partie après le tiret
  if (id.includes("-")) {
    return id.split("-")[1];
  }
  
  // Sinon, ne montrer que les 6 premiers caractères
  return id.substring(0, 6);
} 