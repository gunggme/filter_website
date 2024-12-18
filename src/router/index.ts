import { createRouter, createWebHistory } from 'vue-router'
import CameraSetupView from '@/views/CameraSetupView.vue'
import BackgroundView from '@/views/BackgroundView.vue'
import CharacterView from '@/views/CharacterView.vue'
import TextView from '@/views/TextView.vue'
import FinalView from '@/views/FinalView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/camera-setup'
    },
    {
      path: '/camera-setup',
      name: 'camera-setup',
      component: CameraSetupView
    },
    {
      path: '/background',
      name: 'background',
      component: BackgroundView
    },
    {
      path: '/character',
      name: 'character',
      component: CharacterView
    },
    {
      path: '/text',
      name: 'text',
      component: TextView
    },
    {
      path: '/final',
      name: 'final',
      component: FinalView
    }
  ]
})

export default router
