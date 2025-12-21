import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initDarkMode } from './lib/darkMode'
import './assets/main.css'

initDarkMode()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
