import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

async function globalSetup() {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'

  const app = initializeApp({ projectId: 'demo-corner-click' })
  const db = getFirestore(app)

  const tournamentId = 'e2e-tournament'
  const tournamentRef = db.collection('tournaments').doc(tournamentId)

  await tournamentRef.set({
    name: 'Torneo Nacional E2E',
    date: new Date().toISOString().split('T')[0],
    location: 'Estadio E2E',
    areas: 3,
    status: 'UPCOMING',
    createdAt: new Date().toISOString(),
  })

  const categories = [
    {
      id: 'cat-1',
      name: 'Principiantes',
      gender: 'MALE',
      ageGroup: '18-35',
      beltLevel: 'Blanco',
      weightClass: '-60kg',
      matchDuration: 120,
      rounds: 2,
    },
    {
      id: 'cat-2',
      name: 'Intermedios',
      gender: 'FEMALE',
      ageGroup: '18-35',
      beltLevel: 'Azul',
      weightClass: '-55kg',
      matchDuration: 120,
      rounds: 2,
    },
    {
      id: 'cat-3',
      name: 'Avanzados',
      gender: 'MALE',
      ageGroup: '18-35',
      beltLevel: 'Negro',
      weightClass: '-70kg',
      matchDuration: 120,
      rounds: 2,
    },
  ]

  for (const cat of categories) {
    await tournamentRef.collection('categories').doc(cat.id).set(cat)

    // 8 competitors per category
    for (let i = 1; i <= 8; i++) {
      const compId = `comp-${cat.id}-${i}`
      await tournamentRef
        .collection('competitors')
        .doc(compId)
        .set({
          categoryId: cat.id,
          firstName: `Competidor ${i}`,
          lastName: `Apellido ${cat.name}`,
          club: `Club ${i}`,
          country: 'ARG',
        })
    }
  }

  const judges = [
    {
      id: 'judge-1',
      name: 'Juez Area 1',
      pin: '1111',
      status: 'OFFLINE',
      currentAssignment: null,
    },
    {
      id: 'judge-2',
      name: 'Juez Area 2',
      pin: '2222',
      status: 'OFFLINE',
      currentAssignment: null,
    },
    {
      id: 'judge-3',
      name: 'Juez Area 3',
      pin: '3333',
      status: 'OFFLINE',
      currentAssignment: null,
    },
  ]

  for (const judge of judges) {
    await tournamentRef.collection('judges').doc(judge.id).set(judge)
  }

  console.log('Global Setup: E2E Database seeded successfully!')
}

export default globalSetup
