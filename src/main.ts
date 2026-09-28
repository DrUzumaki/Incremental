// Entry point. For now this only draws the title screen.
// Game systems (state, loop, departments) get added in later build steps.
import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main class="title-screen">
    <div class="title-block">
      <h1 class="title">Resident Life</h1>
      <p class="subtitle">Code Blue</p>
    </div>
  </main>
`
