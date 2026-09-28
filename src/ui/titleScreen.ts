// The title screen, with a button to start the shift.

export function showTitleScreen(app: HTMLElement, onStart: () => void): void {
  app.innerHTML = `
    <main class="title-screen">
      <div class="title-stack">
        <div class="title-block">
          <h1 class="title">Resident Life</h1>
          <p class="subtitle">Code Blue</p>
        </div>
        <button class="start-btn" type="button">Start Shift</button>
      </div>
    </main>
  `
  app.querySelector('.start-btn')!.addEventListener('click', onStart)
}
