import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  if (process.env.USE_FIREBASE_EMULATOR === "true") {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:9000";
    initializeApp({ projectId: "demo-corner-click" });
    console.log("Using Emulator...");
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
    console.log("Using Remote Database...");
  } else {
    throw new Error("Missing Firebase credentials in .env");
  }

  const db = getFirestore();

  console.log("Creating new tournament...");
  const tournamentRef = await db.collection("tournaments").add({
    name: "Torneo Local de Prueba " + new Date().getTime(),
    date: new Date().toISOString().split("T")[0],
    location: "Estadio Central",
    areas: 3,
    status: "UPCOMING",
    createdAt: new Date().toISOString(),
  });

  console.log(`Tournament created with ID: ${tournamentRef.id}`);

  const categories = [
    { name: "Infantil", gender: "MALE", ageGroup: "8-10", beltLevel: "Blanco a Verde", weightClass: "-30kg", matchDuration: 90, rounds: 2 },
    { name: "Infantil", gender: "FEMALE", ageGroup: "8-10", beltLevel: "Blanco a Verde", weightClass: "-30kg", matchDuration: 90, rounds: 2 },
    { name: "Cadetes", gender: "MALE", ageGroup: "11-13", beltLevel: "Azul a Rojo", weightClass: "-45kg", matchDuration: 120, rounds: 2 },
    { name: "Cadetes", gender: "FEMALE", ageGroup: "11-13", beltLevel: "Azul a Rojo", weightClass: "-45kg", matchDuration: 120, rounds: 2 },
    { name: "Adultos", gender: "MALE", ageGroup: "18-35", beltLevel: "Negro", weightClass: "-68kg", matchDuration: 120, rounds: 2 },
    { name: "Adultos", gender: "FEMALE", ageGroup: "18-35", beltLevel: "Negro", weightClass: "-57kg", matchDuration: 120, rounds: 2 },
  ];

  let totalCompetitors = 0;

  for (let c = 0; c < categories.length; c++) {
    const cat = categories[c];
    const catRef = await tournamentRef.collection("categories").add(cat);
    
    // Create 10 competitors per category
    for (let i = 1; i <= 10; i++) {
      await tournamentRef.collection("competitors").add({
        categoryId: catRef.id,
        firstName: `Competidor${totalCompetitors + 1}`,
        lastName: `Test`,
        club: `Club ${Math.floor(Math.random() * 5) + 1}`,
        country: "ARG",
        gender: cat.gender,
      });
      totalCompetitors++;
    }
    console.log(`Created category ${cat.name} ${cat.gender} with 10 competitors.`);
  }

  console.log(`Successfully seeded ${totalCompetitors} competitors across ${categories.length} categories.`);
  console.log("Done!");
}

seed().catch(console.error);
