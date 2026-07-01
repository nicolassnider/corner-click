import { expect, test } from '@playwright/test'

test.describe('Flujo de Torneo Multiarea (Happy Path)', () => {
  test('Administrador y 3 Jueces interactúan', async ({ browser }) => {
    // 1. Abrimos el contexto del Administrador
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()

    // El admin navega a web-admin
    await adminPage.goto('http://localhost:4322/')

    // TODO: Usar el modo UI de Playwright para grabar el login del admin.
    // await adminPage.fill('input[type="email"]', 'admin@test.com');
    // await adminPage.fill('input[type="password"]', 'password123');
    // await adminPage.click('button[type="submit"]');

    // Navegar a la gestión del torneo e2e-tournament
    // await adminPage.click('text=Torneo Nacional E2E');

    // TODO: Hacer clic en "Sortear Llaves" (Shuffle Brackets) para las categorías

    // TODO: Asignar a los jueces a sus respectivas áreas
    // Juez 1 -> Área 1
    // Juez 2 -> Área 2
    // Juez 3 -> Área 3

    // 2. Abrimos los contextos de los Jueces en paralelo
    const judge1Context = await browser.newContext()
    const judge1Page = await judge1Context.newPage()

    const judge2Context = await browser.newContext()
    const judge2Page = await judge2Context.newPage()

    const judge3Context = await browser.newContext()
    const judge3Page = await judge3Context.newPage()

    // Navegan a web-judges
    await judge1Page.goto('http://localhost:4321/')
    await judge2Page.goto('http://localhost:4321/')
    await judge3Page.goto('http://localhost:4321/')

    // Cada juez ingresa su PIN (los PINs están en el global-setup.ts)
    // Juez 1 (1111)
    await judge1Page.fill('input[type="text"]', '1111')
    await judge1Page.click('button[type="submit"]')

    // Juez 2 (2222)
    await judge2Page.fill('input[type="text"]', '2222')
    await judge2Page.click('button[type="submit"]')

    // Juez 3 (3333)
    await judge3Page.fill('input[type="text"]', '3333')
    await judge3Page.click('button[type="submit"]')

    // Verificamos que entraron correctamente y están esperando asignación o en el ScorePad
    await expect(judge1Page.locator('body')).toContainText(/Juez Area 1/i)
    await expect(judge2Page.locator('body')).toContainText(/Juez Area 2/i)
    await expect(judge3Page.locator('body')).toContainText(/Juez Area 3/i)

    // TODO: Cuando el admin asigne las peleas, los ScorePads deberían aparecer.
    // Aquí el test debería hacer clics en los botones de puntos de los jueces.
    // await judge1Page.click('button:has-text("+1 Blue")');
    // await judge1Page.click('button:has-text("Submit Score")');

    // 3. Verificamos Analíticas
    const analyticsContext = await browser.newContext()
    const analyticsPage = await analyticsContext.newPage()
    await analyticsPage.goto('http://localhost:4323/')

    // TODO: Comprobar que los puntos emitidos por los jueces aparecen en el PublicScoreboard.

    // Este test se detendrá aquí por defecto durante el desarrollo si usamos page.pause()
    // Descomentar para pausar la prueba interactiva y grabar clics:
    // await adminPage.pause();
  })
})
