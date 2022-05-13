import * as THREE from 'three'
import { watch } from 'vue'

import ORDALIES from '@/constants/ORDALIES'
import useStore from '@/composables/useStore'

import WebGL from '@/class/three/WebGL'
import Character from '@/class/three/World/Character'
import Environment from '@/class/three/World/old/Environment'
import Croix from '@/class/three/World/Croix'
import OrdalieManager from '@/class/three/World/Ordalie/OrdalieManager'
import Intro from '@/class/three/World/Intro/Intro'
import Didacticiel from './Didacticiel/Didacticiel'
import AudioManager from '../utils/AudioManager'

class World extends THREE.EventDispatcher {
  character: Character
  environment: Environment
  croix: Croix

  constructor() {
    super()

    // Wait for resources
    AudioManager.setup()
    watch(useStore().resourcesLoaded, (value) => this.onResourcesLoaded())
  }

  onResourcesLoaded() {
    console.log('All Resources loaded')
    const items = WebGL.resources.getItems(ORDALIES.ORDALIES_1, 'model')
    console.log('Example to load a resource ', items)
    this.environment = new Environment()

    Intro.create()
    Didacticiel.create()
    // OrdalieManager.create(ORDALIES.ORDALIES_1)
    this.croix = new Croix()
  }

  onUpdate() {
    if (!useStore().resourcesLoaded.value) return

    this.croix.update()
    // this.character.update()
  }
}

export default World
